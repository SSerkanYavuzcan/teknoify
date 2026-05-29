import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Manual backfill examples:
// Full backfill: TCMB_EVDS_API_KEY=... node scripts/update-usd-try-rates.mjs --full
// Custom range: TCMB_EVDS_API_KEY=... node scripts/update-usd-try-rates.mjs --start=2023-01-01 --end=2023-12-31
// PowerShell:
// $env:TCMB_EVDS_API_KEY="..."
// node scripts/update-usd-try-rates.mjs --full

// If TCMB EVDS changes the series code, update this constant.
const EVDS_USD_TRY_SERIES = 'TP.DK.USD.A.YTL';
const DEFAULT_START_DATE = '2020-01-01';
const DEFAULT_LOOKBACK_DAYS = 7;
const EVDS_BASE_URL = 'https://evds2.tcmb.gov.tr/service/evds/';
const DATE_ARGUMENT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const KNOWN_DATE_FIELDS = ['Tarih', 'Date', 'date'];
const KNOWN_SERIES_FIELDS = [EVDS_USD_TRY_SERIES.replaceAll('.', '_')];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, '..');
const usdTryRatesPath = path.join(repositoryRoot, 'data', 'currency', 'usd_try_rates.json');

function getTodayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function printUsage() {
    console.error(
        'Usage: node scripts/update-usd-try-rates.mjs [--full] [--start=YYYY-MM-DD] [--end=YYYY-MM-DD]'
    );
    console.error('Default mode is incremental: latest local rate date minus 7 calendar days to today.');
    console.error('Full backfill: TCMB_EVDS_API_KEY=your_key_here npm run update:usdtry -- --full');
    console.error(
        'Custom range: TCMB_EVDS_API_KEY=your_key_here node scripts/update-usd-try-rates.mjs --start=2023-01-01 --end=2023-12-31'
    );
    console.error('PowerShell: $env:TCMB_EVDS_API_KEY="your_key_here"; npm run update:usdtry -- --full');
}

function isValidIsoDate(value) {
    if (!DATE_ARGUMENT_PATTERN.test(value)) {
        return false;
    }

    const parsedDate = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function addDays(isoDate, days) {
    const date = new Date(`${isoDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
}

function parseArguments(argv) {
    const options = {
        startDate: null,
        endDate: getTodayIsoDate(),
        startDateProvided: false,
        full: false
    };

    for (const argument of argv) {
        if (argument === '--full') {
            options.full = true;
            continue;
        }

        if (argument.startsWith('--start=')) {
            options.startDate = argument.slice('--start='.length);
            options.startDateProvided = true;
            continue;
        }

        if (argument.startsWith('--end=')) {
            options.endDate = argument.slice('--end='.length);
            continue;
        }

        throw new Error(`Unsupported argument: ${argument}`);
    }

    if (options.startDate !== null && !isValidIsoDate(options.startDate)) {
        throw new Error(`Invalid --start date: ${options.startDate}. Expected YYYY-MM-DD.`);
    }

    if (!isValidIsoDate(options.endDate)) {
        throw new Error(`Invalid --end date: ${options.endDate}. Expected YYYY-MM-DD.`);
    }

    if (options.full) {
        options.startDate = DEFAULT_START_DATE;
        options.startDateProvided = false;
    }

    if (options.startDate !== null && options.startDate > options.endDate) {
        throw new Error(
            `Invalid date range: --start (${options.startDate}) must not be after --end (${options.endDate}).`
        );
    }

    return options;
}

function toEvdsDate(isoDate) {
    const [year, month, day] = isoDate.split('-');

    return `${day}-${month}-${year}`;
}

function normalizeEvdsDate(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();

    if (isValidIsoDate(trimmedValue)) {
        return trimmedValue;
    }

    const dayFirstMatch = trimmedValue.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);

    if (!dayFirstMatch) {
        return null;
    }

    const [, day, month, year] = dayFirstMatch;
    const isoDate = `${year}-${month}-${day}`;

    return isValidIsoDate(isoDate) ? isoDate : null;
}

function parseNumericRate(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim().replace(',', '.');

    if (normalizedValue === '') {
        return null;
    }

    const parsedValue = Number(normalizedValue);

    return Number.isFinite(parsedValue) ? parsedValue : null;
}

function findDateField(row) {
    return (
        KNOWN_DATE_FIELDS.find((fieldName) =>
            Object.prototype.hasOwnProperty.call(row, fieldName)
        ) ?? null
    );
}

function findSeriesField(rows) {
    const exactSeriesField = KNOWN_SERIES_FIELDS.find((fieldName) => {
        return rows.some((row) => Object.prototype.hasOwnProperty.call(row, fieldName));
    });

    if (exactSeriesField) {
        return exactSeriesField;
    }

    const candidateFields = new Set();

    for (const row of rows) {
        for (const fieldName of Object.keys(row)) {
            const upperFieldName = fieldName.toUpperCase();

            if (upperFieldName.includes('USD') && !KNOWN_DATE_FIELDS.includes(fieldName)) {
                candidateFields.add(fieldName);
            }
        }
    }

    for (const fieldName of candidateFields) {
        if (rows.some((row) => parseNumericRate(row[fieldName]) !== null)) {
            return fieldName;
        }
    }

    return null;
}

function normalizeEvdsRows(rows) {
    if (!Array.isArray(rows)) {
        throw new Error('Unexpected TCMB EVDS response shape: "items" must be an array.');
    }

    const seriesField = findSeriesField(rows);

    if (!seriesField && rows.length > 0) {
        throw new Error('Unexpected TCMB EVDS response shape: USD/TRY series field was not found.');
    }

    const ratesByDate = new Map();

    for (const row of rows) {
        if (!row || typeof row !== 'object') {
            continue;
        }

        const dateField = findDateField(row);

        if (!dateField || !seriesField) {
            continue;
        }

        const date = normalizeEvdsDate(row[dateField]);
        const usdTry = parseNumericRate(row[seriesField]);

        if (!date || usdTry === null) {
            continue;
        }

        ratesByDate.set(date, {
            date,
            usdTry,
            source: 'TCMB',
            series: EVDS_USD_TRY_SERIES
        });
    }

    return [...ratesByDate.values()].sort((firstRate, secondRate) =>
        firstRate.date.localeCompare(secondRate.date)
    );
}

function createEvdsUrl({ apiKey, startDate, endDate }) {
    const startDateForEvds = toEvdsDate(startDate);
    const endDateForEvds = toEvdsDate(endDate);
    const evdsUrl =
        `${EVDS_BASE_URL}series=${encodeURIComponent(EVDS_USD_TRY_SERIES)}` +
        `&startDate=${startDateForEvds}` +
        `&endDate=${endDateForEvds}` +
        '&type=json' +
        `&key=${encodeURIComponent(apiKey)}`;

    return new URL(evdsUrl);
}

function sanitizeResponsePreview(responseText) {
    return responseText
        .slice(0, 300)
        .replace(/(key=)[^&\s"'<>]+/gi, '$1***')
        .replace(/(TCMB_EVDS_API_KEY[\s:=]+)[^\s"'<>]+/gi, '$1***');
}

async function fetchUsdTryRates({ apiKey, startDate, endDate }) {
    const url = createEvdsUrl({ apiKey, startDate, endDate });

    let response;

    try {
        response = await fetch(url, {
            headers: {
                key: apiKey
            }
        });
    } catch (error) {
        throw new Error(`Network error while requesting TCMB EVDS: ${error.message}`);
    }

    const responseText = await response.text();
    const responsePreview = sanitizeResponsePreview(responseText);
    const responseSnippet = responsePreview ? ` Response preview: ${responsePreview}` : '';

    if (!response.ok) {
        throw new Error(
            `TCMB EVDS request failed with HTTP ${response.status} ${response.statusText}.${responseSnippet}`
        );
    }

    const trimmedResponseText = responseText.trimStart();

    if (trimmedResponseText.startsWith('<') || responseText.includes('<!DOCTYPE')) {
        throw new Error(
            `TCMB EVDS returned HTML instead of JSON. Check EVDS URL format, API key, or endpoint availability.${responseSnippet}`
        );
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {
        throw new Error(`TCMB EVDS returned invalid JSON: ${error.message}.${responseSnippet}`);
    }
}

async function readUsdTryRatesFile() {
    const rawJson = await readFile(usdTryRatesPath, 'utf8');
    const parsedJson = JSON.parse(rawJson);

    return {
        meta: {
            baseCurrency: 'USD',
            quoteCurrency: 'TRY',
            source: 'TCMB',
            series: EVDS_USD_TRY_SERIES,
            frequency: 'daily',
            startDate: DEFAULT_START_DATE,
            endDate: null,
            lastUpdatedAt: null,
            rateField: 'usdTry',
            notes: [
                'Historical USD/TRY rates are fetched from TCMB EVDS.',
                'Rates are stored as normalized daily values in YYYY-MM-DD format.',
                'Do not manually invent exchange rates. Use the update script or verified source data.'
            ],
            ...(parsedJson.meta ?? {})
        },
        rates: Array.isArray(parsedJson.rates) ? parsedJson.rates : []
    };
}

function normalizeExistingRates(rates) {
    const normalizedRatesByDate = new Map();

    for (const rate of rates) {
        if (!rate || typeof rate !== 'object') {
            continue;
        }

        const date = normalizeEvdsDate(rate.date);
        const usdTry = parseNumericRate(rate.usdTry);

        if (!date || usdTry === null) {
            continue;
        }

        normalizedRatesByDate.set(date, {
            date,
            usdTry,
            source: rate.source ?? 'TCMB',
            series: rate.series ?? EVDS_USD_TRY_SERIES
        });
    }

    return [...normalizedRatesByDate.values()].sort((firstRate, secondRate) =>
        firstRate.date.localeCompare(secondRate.date)
    );
}

function mergeRates(existingRates, fetchedRates) {
    const ratesByDate = new Map();

    for (const rate of normalizeExistingRates(existingRates)) {
        ratesByDate.set(rate.date, rate);
    }

    for (const rate of fetchedRates) {
        ratesByDate.set(rate.date, rate);
    }

    return [...ratesByDate.values()].sort((firstRate, secondRate) =>
        firstRate.date.localeCompare(secondRate.date)
    );
}

function areRatesEqual(firstRates, secondRates) {
    const normalizedFirstRates = normalizeExistingRates(firstRates);
    const normalizedSecondRates = normalizeExistingRates(secondRates);

    if (normalizedFirstRates.length !== normalizedSecondRates.length) {
        return false;
    }

    return normalizedFirstRates.every((rate, index) => {
        const otherRate = normalizedSecondRates[index];

        return (
            rate.date === otherRate.date &&
            rate.usdTry === otherRate.usdTry &&
            rate.source === otherRate.source &&
            rate.series === otherRate.series
        );
    });
}

function getLatestAvailableRate(rates) {
    return normalizeExistingRates(rates).at(-1) ?? null;
}

function resolveFetchOptions(parsedOptions, currentData) {
    const latestRate = getLatestAvailableRate(currentData.rates);
    let startDate = parsedOptions.startDate;
    let mode = 'incremental';

    if (parsedOptions.full) {
        startDate = DEFAULT_START_DATE;
        mode = 'full';
    } else if (parsedOptions.startDateProvided) {
        mode = 'custom';
    } else if (latestRate) {
        startDate = addDays(latestRate.date, -DEFAULT_LOOKBACK_DAYS);

        if (startDate < DEFAULT_START_DATE) {
            startDate = DEFAULT_START_DATE;
        }
    } else {
        startDate = DEFAULT_START_DATE;
        mode = 'initial';
    }

    if (startDate > parsedOptions.endDate) {
        throw new Error(
            `Invalid date range: resolved start date (${startDate}) must not be after end date (${parsedOptions.endDate}).`
        );
    }

    return {
        startDate,
        endDate: parsedOptions.endDate,
        mode
    };
}

async function writeUsdTryRatesFile({
    currentData,
    fetchedRates,
    requestedStartDate,
    requestedEndDate,
    fetchStartedAt,
    fetchCompletedAt,
    fetchMode
}) {
    const mergedRates = mergeRates(currentData.rates, fetchedRates);
    const earliestRate = mergedRates.at(0);
    const latestRate = mergedRates.at(-1);
    const output = {
        meta: {
            ...currentData.meta,
            baseCurrency: 'USD',
            quoteCurrency: 'TRY',
            source: 'TCMB',
            series: EVDS_USD_TRY_SERIES,
            frequency: 'daily',
            startDate: earliestRate?.date ?? requestedStartDate,
            endDate: latestRate?.date ?? requestedEndDate,
            lastUpdatedAt: fetchCompletedAt,
            lastFetchStartedAt: fetchStartedAt,
            lastFetchCompletedAt: fetchCompletedAt,
            lastFetchStatus: 'success',
            lastFetchRange: {
                startDate: requestedStartDate,
                endDate: requestedEndDate,
                mode: fetchMode
            },
            lastAvailableRateDate: latestRate?.date ?? null,
            lastAvailableRate: latestRate?.usdTry ?? null,
            rateField: 'usdTry',
            notes: [
                'Historical USD/TRY rates are fetched from TCMB EVDS.',
                'Rates are stored as normalized daily values in YYYY-MM-DD format.',
                'Do not manually invent exchange rates. Use the update script or verified source data.'
            ]
        },
        rates: mergedRates
    };

    await writeFile(usdTryRatesPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

    return output;
}

function getEvdsItems(responseJson) {
    if (!responseJson || typeof responseJson !== 'object') {
        throw new Error('Unexpected TCMB EVDS response shape: response must be a JSON object.');
    }

    if (!Array.isArray(responseJson.items)) {
        throw new Error('Unexpected TCMB EVDS response shape: missing "items" array.');
    }

    return responseJson.items;
}

async function main() {
    let parsedOptions;

    try {
        parsedOptions = parseArguments(process.argv.slice(2));
    } catch (error) {
        console.error(error.message);
        printUsage();
        process.exitCode = 1;
        return;
    }

    const apiKey = process.env.TCMB_EVDS_API_KEY;

    if (!apiKey) {
        console.error('TCMB_EVDS_API_KEY is not set. No USD/TRY rates were fetched or written.');
        console.error(
            'Set it before running the update script. Example: TCMB_EVDS_API_KEY=your_key_here npm run update:usdtry'
        );
        console.error('PowerShell: $env:TCMB_EVDS_API_KEY="your_key_here"; npm run update:usdtry');
        process.exitCode = 1;
        return;
    }

    const currentData = await readUsdTryRatesFile();
    const fetchOptions = resolveFetchOptions(parsedOptions, currentData);
    const existingRateCount = normalizeExistingRates(currentData.rates).length;
    const fetchStartedAt = new Date().toISOString();

    console.log(
        `Fetching TCMB USD/TRY rates from ${fetchOptions.startDate} to ${fetchOptions.endDate} (${fetchOptions.mode} mode)...`
    );

    const responseJson = await fetchUsdTryRates({
        apiKey,
        startDate: fetchOptions.startDate,
        endDate: fetchOptions.endDate
    });
    const fetchCompletedAt = new Date().toISOString();
    const items = getEvdsItems(responseJson);
    const fetchedRates = normalizeEvdsRows(items);

    console.log(`Received ${items.length.toLocaleString('en-US')} rows from TCMB EVDS.`);

    if (fetchedRates.length === 0) {
        console.log('No new valid TCMB rows found. Existing dataset kept unchanged.');

        if (existingRateCount > 0) {
            return;
        }

        console.error('No existing USD/TRY rates are available for fallback.');
        process.exitCode = 1;
        return;
    }

    const mergedRates = mergeRates(currentData.rates, fetchedRates);

    if (areRatesEqual(currentData.rates, mergedRates)) {
        console.log('No USD/TRY rate changes found. Existing dataset kept unchanged.');
        return;
    }

    const output = await writeUsdTryRatesFile({
        currentData,
        fetchedRates,
        requestedStartDate: fetchOptions.startDate,
        requestedEndDate: fetchOptions.endDate,
        fetchStartedAt,
        fetchCompletedAt,
        fetchMode: fetchOptions.mode
    });
    const latestRate = output.rates.at(-1);

    console.log(
        `Wrote ${output.rates.length.toLocaleString('en-US')} normalized rates to data/currency/usd_try_rates.json.`
    );
    console.log(`Last available rate: ${latestRate.date} = ${latestRate.usdTry}`);
}

main().catch((error) => {
    console.error('Failed to update USD/TRY rates safely. Existing data was not modified.');
    console.error(error.message);
    process.exitCode = 1;
});
