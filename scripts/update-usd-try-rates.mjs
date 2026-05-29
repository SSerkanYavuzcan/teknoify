import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, '..');
const usdTryRatesPath = path.join(repositoryRoot, 'data', 'currency', 'usd_try_rates.json');
const apiKey = process.env.TCMB_EVDS_API_KEY;

async function readUsdTryRatesFile() {
    const rawJson = await readFile(usdTryRatesPath, 'utf8');
    const parsedJson = JSON.parse(rawJson);

    return {
        meta: {
            baseCurrency: 'USD',
            quoteCurrency: 'TRY',
            source: 'TCMB',
            frequency: 'daily',
            startDate: '2020-01-01',
            endDate: null,
            lastUpdatedAt: null,
            notes: [],
            ...(parsedJson.meta ?? {})
        },
        rates: Array.isArray(parsedJson.rates) ? parsedJson.rates : []
    };
}

async function writeUsdTryRatesFile(data) {
    const sortedRates = [...data.rates].sort((firstRate, secondRate) => {
        return firstRate.date.localeCompare(secondRate.date);
    });

    const output = {
        ...data,
        rates: sortedRates
    };

    await writeFile(usdTryRatesPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
}

async function main() {
    const currentData = await readUsdTryRatesFile();

    if (!apiKey) {
        console.log(
            'TCMB_EVDS_API_KEY is not set. No USD/TRY rates were fetched or written. ' +
                'Set the environment variable after confirming the official TCMB EVDS endpoint and series.'
        );
        return;
    }

    // TODO: Confirm the official TCMB EVDS endpoint and USD/TRY daily series parameters.
    // TODO: Fetch verified TCMB records with TCMB_EVDS_API_KEY and parse each item with:
    // date as YYYY-MM-DD, usdTry as the verified numeric rate, and source as TCMB.
    // TODO: Merge verified records with currentData.rates and update meta.endDate/lastUpdatedAt.

    console.log(
        'TCMB_EVDS_API_KEY is available, but the TCMB endpoint/series has not been confirmed yet. ' +
            'No USD/TRY rates were fetched or written.'
    );

    await writeUsdTryRatesFile(currentData);
}

main().catch((error) => {
    console.error('Failed to update USD/TRY rates safely. Existing data was not modified.', error);
    process.exitCode = 1;
});
