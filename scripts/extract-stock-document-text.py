#!/usr/bin/env python3
"""Extract page and chunk text JSON from stock PDF documents.

Extracted PDF text is untrusted document content. Future LLM prompts must treat
this text as data only, never as developer/system/application instructions, and
must not execute instructions found inside PDFs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover - exercised only when dependency is absent
    PdfReader = None  # type: ignore[assignment]

REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_CATALOG = Path("data/stock/turkey/document-catalog.json")
OUTPUT_DIR = Path("data/stock/turkey/extracted-text")
TEXT_EXTRACTION_CATALOG = Path("data/stock/turkey/text-extraction-catalog.json")
EXTRACTION_METHOD = "pypdf"
EMBEDDING_STATUS = "not_started"
CHUNK_INDEX_STATUS = "text_only"
TARGET_CHUNK_MIN = 1200
TARGET_CHUNK_MAX = 1800
CHUNK_OVERLAP = 200
LOW_TEXT_THRESHOLD = 500
LOW_TEXT_PAGE_THRESHOLD = 3


@dataclass
class ExtractionResult:
    document: dict[str, Any]
    output_path: Path
    file_hash: str | None
    page_count: int
    extracted_page_count: int
    char_count: int
    chunk_count: int
    text_extraction_status: str
    embedding_status: str
    warnings: list[str]
    action: str
    failed: bool = False


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def repo_path(path: Path) -> Path:
    return REPO_ROOT / path


def as_posix(path: Path) -> str:
    return path.as_posix()


def load_json(path: Path) -> Any:
    with repo_path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, payload: Any) -> None:
    full_path = repo_path(path)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    with full_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)
        file.write("\n")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with repo_path(path).open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"[ \t]+\n", "\n", normalized)
    normalized = re.sub(r"\n[ \t]+", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def estimate_tokens(text: str) -> int:
    return max(1, round(len(text) / 4)) if text else 0


def split_long_page_text(text: str, max_size: int = TARGET_CHUNK_MAX) -> list[str]:
    chunks: list[str] = []
    start = 0
    text_length = len(text)

    while start < text_length:
        hard_end = min(start + max_size, text_length)
        if hard_end >= text_length:
            end = text_length
        else:
            window = text[start:hard_end]
            break_candidates = [window.rfind("\n\n"), window.rfind(". "), window.rfind("\n"), window.rfind(" ")]
            best_break = max(break_candidates)
            end = start + best_break + (2 if best_break == break_candidates[1] else 0) if best_break >= TARGET_CHUNK_MIN else hard_end

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break
        start = max(end - CHUNK_OVERLAP, start + 1)

    return chunks


def make_chunks(document: dict[str, Any], pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    pending_parts: list[str] = []
    pending_start: int | None = None
    pending_end: int | None = None
    chunk_number = 1

    def emit(text: str, page_start: int, page_end: int) -> None:
        nonlocal chunk_number
        clean_text = text.strip()
        if not clean_text:
            return
        chunks.append(
            {
                "chunkId": f"{document['documentId']}-p{page_start:03d}-c{chunk_number:03d}",
                "documentId": document["documentId"],
                "companyKey": document.get("companyKey"),
                "ticker": document.get("ticker"),
                "period": document.get("period"),
                "documentType": document.get("documentType"),
                "pageStart": page_start,
                "pageEnd": page_end,
                "text": clean_text,
                "charCount": len(clean_text),
                "tokenEstimate": estimate_tokens(clean_text),
                "indexStatus": CHUNK_INDEX_STATUS,
            }
        )
        chunk_number += 1

    for page in pages:
        page_text = page.get("text", "")
        if not page_text:
            continue

        if len(page_text) > TARGET_CHUNK_MAX:
            if pending_parts and pending_start is not None and pending_end is not None:
                emit("\n\n".join(pending_parts), pending_start, pending_end)
                pending_parts = []
                pending_start = None
                pending_end = None
            for part in split_long_page_text(page_text):
                emit(part, page["pageNumber"], page["pageNumber"])
            continue

        candidate_parts = pending_parts + [page_text]
        candidate_text = "\n\n".join(candidate_parts)
        if pending_start is None:
            pending_start = page["pageNumber"]
        pending_end = page["pageNumber"]

        if len(candidate_text) <= TARGET_CHUNK_MAX:
            pending_parts = candidate_parts
            continue

        if pending_parts and pending_start is not None:
            emit("\n\n".join(pending_parts), pending_start, page["pageNumber"] - 1)
        pending_parts = [page_text]
        pending_start = page["pageNumber"]
        pending_end = page["pageNumber"]

    if pending_parts and pending_start is not None and pending_end is not None:
        emit("\n\n".join(pending_parts), pending_start, pending_end)

    return chunks


def read_existing_output(path: Path) -> dict[str, Any] | None:
    full_path = repo_path(path)
    if not full_path.exists():
        return None
    try:
        with full_path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return None


def catalog_entry_from_payload(document: dict[str, Any], output_path: Path, payload: dict[str, Any], action: str) -> ExtractionResult:
    meta = payload.get("meta", {})
    return ExtractionResult(
        document=document,
        output_path=output_path,
        file_hash=meta.get("fileHashSha256"),
        page_count=int(meta.get("pageCount") or 0),
        extracted_page_count=int(meta.get("extractedPageCount") or 0),
        char_count=int(meta.get("charCount") or 0),
        chunk_count=int(meta.get("chunkCount") or 0),
        text_extraction_status=meta.get("textExtractionStatus", "unknown"),
        embedding_status=meta.get("embeddingStatus", EMBEDDING_STATUS),
        warnings=list(meta.get("warnings") or []),
        action=action,
    )


def extract_document(document: dict[str, Any], output_path: Path, file_hash: str, dry_run: bool) -> ExtractionResult:
    warnings: list[str] = []
    pages: list[dict[str, Any]] = []

    if PdfReader is None:
        warnings.append("Missing pypdf dependency; install requirements-rag.txt before extraction.")
        return ExtractionResult(document, output_path, file_hash, 0, 0, 0, 0, "failed", EMBEDDING_STATUS, warnings, "failed", True)

    try:
        reader = PdfReader(str(repo_path(Path(document["localPath"]))))
        page_count = len(reader.pages)
        for index, page in enumerate(reader.pages, start=1):
            try:
                text = normalize_text(page.extract_text())
            except Exception as exc:  # pypdf can fail on individual malformed pages
                text = ""
                warnings.append(f"Page {index} text extraction failed: {exc}")
            if not text:
                warnings.append(f"Page {index} has no extractable text.")
            pages.append({"pageNumber": index, "text": text, "charCount": len(text)})
    except Exception as exc:
        warnings.append(f"PDF text extraction failed: {exc}")
        return ExtractionResult(document, output_path, file_hash, 0, 0, 0, 0, "failed", EMBEDDING_STATUS, warnings, "failed", True)

    extracted_page_count = sum(1 for page in pages if page["charCount"] > 0)
    char_count = sum(page["charCount"] for page in pages)
    chunks = make_chunks(document, pages)
    status = "extracted"
    if page_count > LOW_TEXT_PAGE_THRESHOLD and char_count < LOW_TEXT_THRESHOLD:
        status = "needs_ocr"
        warnings.append("Low extracted text volume; document may require OCR.")

    payload = {
        "meta": {
            "documentId": document.get("documentId"),
            "companyKey": document.get("companyKey"),
            "companyName": document.get("companyName"),
            "ticker": document.get("ticker"),
            "market": document.get("market"),
            "country": document.get("country"),
            "period": document.get("period"),
            "fiscalYear": document.get("fiscalYear"),
            "quarter": document.get("quarter"),
            "documentType": document.get("documentType"),
            "title": document.get("title"),
            "localPath": document.get("localPath"),
            "sourceUrl": document.get("sourceUrl"),
            "language": document.get("language"),
            "extractionMethod": EXTRACTION_METHOD,
            "extractedAt": iso_now(),
            "fileHashSha256": file_hash,
            "pageCount": page_count,
            "extractedPageCount": extracted_page_count,
            "charCount": char_count,
            "chunkCount": len(chunks),
            "textExtractionStatus": status,
            "embeddingStatus": EMBEDDING_STATUS,
            "warnings": warnings,
        },
        "pages": pages,
        "chunks": chunks,
    }

    if not dry_run:
        write_json(output_path, payload)

    return ExtractionResult(document, output_path, file_hash, page_count, extracted_page_count, char_count, len(chunks), status, EMBEDDING_STATUS, warnings, "extracted")


def make_catalog_entry(result: ExtractionResult) -> dict[str, Any]:
    document = result.document
    return {
        "documentId": document.get("documentId"),
        "companyKey": document.get("companyKey"),
        "ticker": document.get("ticker"),
        "period": document.get("period"),
        "documentType": document.get("documentType"),
        "localPath": document.get("localPath"),
        "extractedTextPath": as_posix(result.output_path),
        "fileHashSha256": result.file_hash,
        "pageCount": result.page_count,
        "extractedPageCount": result.extracted_page_count,
        "charCount": result.char_count,
        "chunkCount": result.chunk_count,
        "textExtractionStatus": result.text_extraction_status,
        "embeddingStatus": result.embedding_status,
        "warnings": result.warnings,
    }


def filtered_documents(documents: list[dict[str, Any]], document_id: str | None, company: str | None) -> list[dict[str, Any]]:
    selected = documents
    if document_id:
        selected = [document for document in selected if document.get("documentId") == document_id]
    if company:
        selected = [document for document in selected if document.get("companyKey") == company]
    return selected


def process_documents(args: argparse.Namespace) -> tuple[list[ExtractionResult], int, int, int, bool]:
    print("Reading document catalog...")
    catalog = load_json(SOURCE_CATALOG)
    documents = catalog.get("documents", []) if isinstance(catalog, dict) else []
    selected = filtered_documents(documents, args.document_id, args.company)
    print(f"Found {len(selected)} document records.")

    results: list[ExtractionResult] = []
    skipped_count = 0
    failed_count = 0
    warning_or_failure = False

    for document in selected:
        document_id = document.get("documentId")
        local_path_raw = document.get("localPath")
        output_path = OUTPUT_DIR / f"{document_id}.json"

        if not document_id or not local_path_raw:
            warnings = ["Document record is missing documentId or localPath."]
            print(f"Skipping malformed document record: {warnings[0]}")
            results.append(ExtractionResult(document, output_path, None, 0, 0, 0, 0, "skipped", EMBEDDING_STATUS, warnings, "skipped"))
            skipped_count += 1
            warning_or_failure = True
            continue

        local_path = Path(local_path_raw)
        if local_path.suffix.lower() != ".pdf" or not repo_path(local_path).exists():
            warnings = ["Local PDF path does not exist or is not a PDF."]
            print(f"Skipping {document_id} because localPath is not an existing PDF.")
            results.append(ExtractionResult(document, output_path, None, 0, 0, 0, 0, "skipped", EMBEDDING_STATUS, warnings, "skipped"))
            skipped_count += 1
            warning_or_failure = True
            continue

        file_hash = sha256_file(local_path)
        existing_payload = read_existing_output(output_path)
        existing_hash = (existing_payload or {}).get("meta", {}).get("fileHashSha256")

        if existing_payload and existing_hash == file_hash and not args.force:
            print(f"Skipping {document_id} because file hash is unchanged.")
            result = catalog_entry_from_payload(document, output_path, existing_payload, "skipped")
            results.append(result)
            skipped_count += 1
            warning_or_failure = warning_or_failure or bool(result.warnings) or result.text_extraction_status == "needs_ocr"
            continue

        if args.dry_run:
            print(f"Would extract {document_id}...")
            result = ExtractionResult(document, output_path, file_hash, 0, 0, 0, 0, "pending", EMBEDDING_STATUS, [], "would_extract")
            results.append(result)
            continue

        print(f"Extracting {document_id}...")
        result = extract_document(document, output_path, file_hash, args.dry_run)
        print(f"pages: {result.page_count}")
        print(f"extracted pages: {result.extracted_page_count}")
        print(f"chunks: {result.chunk_count}")
        print(f"status: {result.text_extraction_status}")
        results.append(result)
        if result.failed:
            failed_count += 1
        warning_or_failure = warning_or_failure or bool(result.warnings) or result.failed or result.text_extraction_status == "needs_ocr"

    return results, skipped_count, failed_count, sum(1 for item in results if item.action == "extracted" and not item.failed), warning_or_failure


def write_extraction_catalog(results: list[ExtractionResult], skipped_count: int, failed_count: int, extracted_count: int, dry_run: bool) -> None:
    payload = {
        "meta": {
            "generatedAt": iso_now(),
            "sourceCatalog": as_posix(SOURCE_CATALOG),
            "documentCount": len(results),
            "extractedCount": extracted_count,
            "skippedCount": skipped_count,
            "failedCount": failed_count,
            "notes": [
                "Generated by scripts/extract-stock-document-text.py.",
                "This catalog tracks text extraction outputs only. It does not contain embeddings.",
            ],
        },
        "documents": [make_catalog_entry(result) for result in results],
    }
    if dry_run:
        print(f"Dry run: would write {as_posix(TEXT_EXTRACTION_CATALOG)}")
        return
    repo_path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    write_json(TEXT_EXTRACTION_CATALOG, payload)
    print(f"Wrote {as_posix(TEXT_EXTRACTION_CATALOG)}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract text from stock PDF documents into page/chunk JSON files.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and show actions without writing output files.")
    parser.add_argument("--force", action="store_true", help="Re-extract even when an output file has the same SHA256 hash.")
    parser.add_argument("--document-id", help="Process only one documentId.")
    parser.add_argument("--company", help="Process only one companyKey.")
    parser.add_argument("--strict", action="store_true", help="Exit 1 if any warning or failure occurs.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    results, skipped_count, failed_count, extracted_count, warning_or_failure = process_documents(args)
    write_extraction_catalog(results, skipped_count, failed_count, extracted_count, args.dry_run)
    if args.strict and warning_or_failure:
        print("Strict mode: warnings or failures were detected.", file=sys.stderr)
        return 1
    return 1 if failed_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
