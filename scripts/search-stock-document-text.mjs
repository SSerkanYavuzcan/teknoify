#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const extractedTextDir = path.join(repoRoot, 'data', 'stock', 'turkey', 'extracted-text');
const DEFAULT_TOP = 5;
const DEFAULT_SNIPPET_LENGTH = 350;

function normalizeText(value) {
    return String(value ?? '')
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i')
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseArgs(argv) {
    const options = {
        query: '',
        company: '',
        ticker: '',
        period: '',
        documentType: '',
        top: DEFAULT_TOP,
        json: false,
        showText: false,
        strict: false,
    };

    for (const arg of argv) {
        if (!arg.startsWith('--')) {
            throw new Error(`Unsupported positional argument: ${arg}`);
        }

        const [rawKey, ...valueParts] = arg.slice(2).split('=');
        const key = rawKey.trim();
        const value = valueParts.join('=').trim();

        switch (key) {
            case 'query':
                options.query = value;
                break;
            case 'company':
                options.company = value;
                break;
            case 'ticker':
                options.ticker = value;
                break;
            case 'period':
                options.period = value;
                break;
            case 'document-type':
                options.documentType = value;
                break;
            case 'top': {
                const parsedTop = Number.parseInt(value, 10);
                if (!Number.isInteger(parsedTop) || parsedTop < 1) {
                    throw new Error('--top must be a positive integer.');
                }
                options.top = parsedTop;
                break;
            }
            case 'json':
                options.json = true;
                break;
            case 'show-text':
                options.showText = true;
                break;
            case 'strict':
                options.strict = true;
                break;
            default:
                throw new Error(`Unsupported option: --${key}`);
        }
    }

    if (!options.query.trim()) {
        throw new Error('--query must be provided and non-empty.');
    }

    return options;
}

function isMeaningfulShortToken(token) {
    return /^\d+$/.test(token) || /^[1-4]ç$/.test(token);
}

function tokenizeQuery(query) {
    return normalizeText(query)
        .split(/\s+/)
        .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
        .filter((token) => token.length > 2 || isMeaningfulShortToken(token));
}

function countOccurrences(text, token) {
    if (!token) {
        return 0;
    }

    let count = 0;
    let fromIndex = 0;

    while (fromIndex < text.length) {
        const foundIndex = text.indexOf(token, fromIndex);
        if (foundIndex === -1) {
            break;
        }

        count += 1;
        fromIndex = foundIndex + token.length;
    }

    return count;
}

function cleanTerminalText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function buildSnippet(originalText, normalizedText, queryPhrase, queryTokens) {
    const cleanText = cleanTerminalText(originalText);

    if (!cleanText) {
        return '';
    }

    const candidates = [queryPhrase, ...queryTokens].filter(Boolean);
    const matchIndex = candidates.reduce((bestIndex, candidate) => {
        if (bestIndex !== -1) {
            return bestIndex;
        }

        return normalizedText.indexOf(candidate);
    }, -1);

    if (matchIndex === -1) {
        return cleanText.slice(0, DEFAULT_SNIPPET_LENGTH);
    }

    const roughRatio = originalText.length / Math.max(normalizedText.length, 1);
    const originalMatchIndex = Math.max(0, Math.floor(matchIndex * roughRatio));
    const halfLength = Math.floor(DEFAULT_SNIPPET_LENGTH / 2);
    const start = Math.max(0, originalMatchIndex - halfLength);
    const end = Math.min(cleanText.length, start + DEFAULT_SNIPPET_LENGTH);
    const prefix = start > 0 ? '... ' : '';
    const suffix = end < cleanText.length ? ' ...' : '';

    return `${prefix}${cleanText.slice(start, end)}${suffix}`;
}

function getChunkMetadata(chunk) {
    return {
        chunkId: chunk.chunkId ?? '',
        documentId: chunk.documentId ?? '',
        companyKey: chunk.companyKey ?? '',
        ticker: chunk.ticker ?? '',
        period: chunk.period ?? '',
        documentType: chunk.documentType ?? '',
        pageStart: chunk.pageStart ?? null,
        pageEnd: chunk.pageEnd ?? null,
        text: chunk.text ?? '',
        charCount: chunk.charCount ?? null,
        tokenEstimate: chunk.tokenEstimate ?? null,
    };
}

function metadataContains(metadata, token) {
    const weightedFields = [
        ['documentId', 1],
        ['companyKey', 3],
        ['ticker', 3],
        ['period', 2],
        ['documentType', 1],
    ];

    return weightedFields.reduce((score, [fieldName, weight]) => {
        const normalizedValue = normalizeText(metadata[fieldName]);
        return normalizedValue.includes(token) ? score + weight : score;
    }, 0);
}

function scoreChunk(chunk, queryPhrase, queryTokens, strict) {
    const metadata = getChunkMetadata(chunk);
    const normalizedText = normalizeText(metadata.text);
    const phraseMatched = queryPhrase.length > 0 && normalizedText.includes(queryPhrase);
    const matchedTerms = [];
    let score = phraseMatched ? 20 : 0;
    let tokenOccurrenceTotal = 0;

    for (const token of queryTokens) {
        const textOccurrences = countOccurrences(normalizedText, token);
        const metadataScore = metadataContains(metadata, token);

        if (textOccurrences > 0 || metadataScore > 0) {
            matchedTerms.push(token);
        }

        score += textOccurrences * 2;
        score += metadataScore;
        tokenOccurrenceTotal += textOccurrences;
    }

    const allTokensPresent = queryTokens.length > 0 && queryTokens.every((token) => matchedTerms.includes(token));

    if (allTokensPresent) {
        score += 10;
    }

    if (tokenOccurrenceTotal > 0 && metadata.charCount) {
        score += Math.min(5, tokenOccurrenceTotal / Math.max(metadata.charCount / 1000, 1));
    }

    if (strict && !allTokensPresent) {
        return null;
    }

    if (score <= 0) {
        return null;
    }

    return {
        ...metadata,
        score: Number(score.toFixed(2)),
        matchedTerms: [...new Set(matchedTerms)],
        phraseMatched,
        snippet: buildSnippet(metadata.text, normalizedText, queryPhrase, queryTokens),
    };
}

function chunkMatchesFilters(chunk, filters) {
    const metadata = getChunkMetadata(chunk);

    return (
        (!filters.company || normalizeText(metadata.companyKey) === normalizeText(filters.company)) &&
        (!filters.ticker || normalizeText(metadata.ticker) === normalizeText(filters.ticker)) &&
        (!filters.period || normalizeText(metadata.period) === normalizeText(filters.period)) &&
        (!filters.documentType || normalizeText(metadata.documentType) === normalizeText(filters.documentType))
    );
}

async function readExtractedChunks() {
    const files = (await readdir(extractedTextDir))
        .filter((fileName) => fileName.endsWith('.json'))
        .sort((a, b) => a.localeCompare(b));
    const chunks = [];

    for (const fileName of files) {
        const filePath = path.join(extractedTextDir, fileName);
        const parsedFile = JSON.parse(await readFile(filePath, 'utf8'));

        for (const chunk of parsedFile.chunks ?? []) {
            chunks.push(chunk);
        }
    }

    return chunks;
}

function buildFilters(options) {
    return {
        company: options.company || null,
        ticker: options.ticker || null,
        period: options.period || null,
        documentType: options.documentType || null,
        strict: options.strict || false,
    };
}

function formatPageRange(result) {
    if (result.pageStart === result.pageEnd || !result.pageEnd) {
        return `page ${result.pageStart ?? 'unknown'}`;
    }

    return `pages ${result.pageStart}-${result.pageEnd}`;
}

function toJsonResult(result, rank, showText) {
    return {
        rank,
        score: result.score,
        matchedTerms: result.matchedTerms,
        phraseMatched: result.phraseMatched,
        documentId: result.documentId,
        companyKey: result.companyKey,
        ticker: result.ticker,
        period: result.period,
        documentType: result.documentType,
        pageStart: result.pageStart,
        pageEnd: result.pageEnd,
        chunkId: result.chunkId,
        snippet: result.snippet,
        text: showText ? result.text : null,
        charCount: result.charCount,
        tokenEstimate: result.tokenEstimate,
    };
}

function printHumanReadable(options, filters, searchedChunkCount, results) {
    console.log(`Query: ${options.query}`);
    console.log(`Filters: ${JSON.stringify(filters)}`);
    console.log(`Searched chunks: ${searchedChunkCount}`);
    console.log(`Results: ${results.length}`);

    for (const [index, result] of results.entries()) {
        console.log('');
        console.log(
            `[${index + 1}] score=${result.score} | ${result.ticker || 'N/A'} | ${result.period || 'N/A'} | ${
                result.documentType || 'N/A'
            } | ${formatPageRange(result)}`,
        );
        console.log(`Document: ${result.documentId}`);
        console.log(`Chunk: ${result.chunkId}`);
        console.log(`Matched: ${result.matchedTerms.join(', ') || 'none'}`);
        console.log(`Phrase matched: ${result.phraseMatched ? 'yes' : 'no'}`);
        console.log('Snippet:');
        console.log(result.snippet);

        if (options.showText) {
            console.log('Full text:');
            console.log(result.text);
        }
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const filters = buildFilters(options);
    const queryPhrase = normalizeText(options.query);
    const queryTokens = tokenizeQuery(options.query);
    const allChunks = await readExtractedChunks();
    const filteredChunks = allChunks.filter((chunk) => chunkMatchesFilters(chunk, filters));
    const scoredResults = filteredChunks
        .map((chunk) => scoreChunk(chunk, queryPhrase, queryTokens, options.strict))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || String(a.chunkId).localeCompare(String(b.chunkId)))
        .slice(0, options.top);

    if (options.json) {
        console.log(
            JSON.stringify(
                {
                    query: options.query,
                    normalizedQuery: queryPhrase,
                    filters,
                    searchedChunkCount: filteredChunks.length,
                    resultCount: scoredResults.length,
                    results: scoredResults.map((result, index) => toJsonResult(result, index + 1, options.showText)),
                },
                null,
                2,
            ),
        );
        return;
    }

    printHumanReadable(options, filters, filteredChunks.length, scoredResults);
}

main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
});
