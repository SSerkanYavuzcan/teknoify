#!/usr/bin/env node

import { access, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const sourceRoot = 'data/stock/turkey';
const sourceRootPath = path.join(repoRoot, sourceRoot);
const catalogRelativePath = path.join(sourceRoot, 'document-catalog.json').replaceAll(path.sep, '/');
const catalogPath = path.join(repoRoot, catalogRelativePath);

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const strict = args.has('--strict');
const pretty = args.has('--pretty');

const knownOptions = new Set(['--dry-run', '--strict', '--pretty']);
for (const arg of args) {
  if (!knownOptions.has(arg)) {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  }
}

const requiredCompanyFields = ['companyKey', 'companyName', 'ticker', 'market', 'country'];
const requiredDocumentFields = ['id', 'localPath', 'documentType', 'title'];
const warnings = [];

function warn(message) {
  warnings.push(message);
  console.warn(`Warning: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toRepoRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');
}

function isInside(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function fileExists(absolutePath) {
  try {
    const fileStat = await stat(absolutePath);
    return fileStat.isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function findCompanyManifests() {
  const entries = await readdir(sourceRootPath, { withFileTypes: true });
  const manifests = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const companyFolderPath = path.join(sourceRootPath, entry.name);
    const manifestPath = path.join(companyFolderPath, 'manifest.json');

    try {
      await access(manifestPath);
      manifests.push({ companyFolderName: entry.name, companyFolderPath, manifestPath });
    } catch (error) {
      if (error.code === 'ENOENT') {
        warn(`Missing manifest.json in ${toRepoRelative(companyFolderPath)}`);
        continue;
      }
      throw error;
    }
  }

  return manifests.sort((a, b) => a.companyFolderName.localeCompare(b.companyFolderName));
}

function validateCompanyManifest(manifest, manifestPath) {
  const manifestRelativePath = toRepoRelative(manifestPath);

  if (!isPlainObject(manifest)) {
    warn(`${manifestRelativePath} must contain a JSON object`);
    return false;
  }

  let isValid = true;
  for (const field of requiredCompanyFields) {
    if (!hasNonEmptyString(manifest[field])) {
      warn(`${manifestRelativePath} missing required company field: ${field}`);
      isValid = false;
    }
  }

  if (!Array.isArray(manifest.documents)) {
    warn(`${manifestRelativePath} missing required company field: documents array`);
    isValid = false;
  }

  return isValid;
}

function validateDocument(documentEntry, manifestPath, index) {
  const manifestRelativePath = toRepoRelative(manifestPath);

  if (!isPlainObject(documentEntry)) {
    warn(`${manifestRelativePath} document at index ${index} must be an object`);
    return false;
  }

  let isValid = true;
  for (const field of requiredDocumentFields) {
    if (!hasNonEmptyString(documentEntry[field])) {
      warn(`${manifestRelativePath} document at index ${index} missing required field: ${field}`);
      isValid = false;
    }
  }

  return isValid;
}

function buildCatalogDocument(companyManifest, documentEntry, repoRelativeLocalPath) {
  return {
    documentId: documentEntry.id,
    companyKey: companyManifest.companyKey,
    companyName: companyManifest.companyName,
    ticker: companyManifest.ticker,
    market: companyManifest.market,
    country: companyManifest.country,
    period: documentEntry.period ?? null,
    fiscalYear: documentEntry.fiscalYear ?? null,
    quarter: documentEntry.quarter ?? null,
    documentType: documentEntry.documentType,
    title: documentEntry.title,
    localPath: repoRelativeLocalPath,
    sourceUrl: documentEntry.sourceUrl ?? null,
    language: documentEntry.language ?? null,
    uploadedAt: documentEntry.uploadedAt ?? null,
    notes: documentEntry.notes ?? '',
    indexStatus: 'metadata_only',
    textExtractionStatus: 'not_started',
    embeddingStatus: 'not_started'
  };
}

async function buildCatalog() {
  const manifests = await findCompanyManifests();
  const documents = [];
  const seenDocumentIds = new Set();
  const seenLocalPaths = new Set();
  let documentEntryCount = 0;

  for (const manifestInfo of manifests) {
    let manifest;
    try {
      manifest = await readJson(manifestInfo.manifestPath);
    } catch (error) {
      warn(`Could not read JSON from ${toRepoRelative(manifestInfo.manifestPath)}: ${error.message}`);
      continue;
    }

    if (!validateCompanyManifest(manifest, manifestInfo.manifestPath)) {
      continue;
    }

    for (const [index, documentEntry] of manifest.documents.entries()) {
      documentEntryCount += 1;

      if (!validateDocument(documentEntry, manifestInfo.manifestPath, index)) {
        continue;
      }

      if (seenDocumentIds.has(documentEntry.id)) {
        warn(`Duplicate document id skipped: ${documentEntry.id}`);
        continue;
      }

      if (path.isAbsolute(documentEntry.localPath)) {
        warn(`Absolute localPath skipped for document ${documentEntry.id}: ${documentEntry.localPath}`);
        continue;
      }

      const resolvedLocalPath = path.resolve(manifestInfo.companyFolderPath, documentEntry.localPath);
      if (!isInside(manifestInfo.companyFolderPath, resolvedLocalPath)) {
        warn(`localPath escapes company folder and was skipped for document ${documentEntry.id}: ${documentEntry.localPath}`);
        continue;
      }

      const repoRelativeLocalPath = toRepoRelative(resolvedLocalPath);
      if (seenLocalPaths.has(repoRelativeLocalPath)) {
        warn(`Duplicate localPath skipped: ${repoRelativeLocalPath}`);
        continue;
      }

      if (path.extname(resolvedLocalPath).toLowerCase() !== '.pdf') {
        warn(`Unsupported file type skipped for document ${documentEntry.id}: ${repoRelativeLocalPath}`);
        continue;
      }

      if (!(await fileExists(resolvedLocalPath))) {
        warn(`Missing local PDF skipped for document ${documentEntry.id}: ${repoRelativeLocalPath}`);
        continue;
      }

      seenDocumentIds.add(documentEntry.id);
      seenLocalPaths.add(repoRelativeLocalPath);
      documents.push(buildCatalogDocument(manifest, documentEntry, repoRelativeLocalPath));
    }
  }

  documents.sort((a, b) => {
    const companyCompare = a.companyKey.localeCompare(b.companyKey);
    if (companyCompare !== 0) return companyCompare;
    return a.documentId.localeCompare(b.documentId);
  });

  return {
    manifestCount: manifests.length,
    documentEntryCount,
    catalog: {
      meta: {
        generatedAt: new Date().toISOString(),
        sourceRoot,
        documentCount: documents.length,
        companyCount: manifests.length,
        notes: [
          'Generated from company manifest.json files.',
          'This catalog stores document metadata only. It does not contain extracted PDF text or embeddings.'
        ]
      },
      documents
    }
  };
}

const { manifestCount, documentEntryCount, catalog } = await buildCatalog();

console.log(`Found ${manifestCount} company manifests`);
console.log(`Found ${documentEntryCount} document entries`);
console.log(`Added ${catalog.documents.length} existing documents`);
console.log(`Warnings: ${warnings.length}`);

if (warnings.length > 0 && strict) {
  console.error('Strict mode failed because validation warnings were found.');
  process.exit(1);
}

if (dryRun) {
  console.log('Dry run enabled; no catalog file was written.');
} else {
  const spacing = pretty ? 2 : 2;
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, spacing)}\n`, 'utf8');
  console.log(`Wrote ${catalogRelativePath}`);
}
