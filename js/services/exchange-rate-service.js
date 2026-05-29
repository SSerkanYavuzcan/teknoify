(function () {
  const dataPathCandidates = [
    '../data/currency/usd_try_rates.json',
    'data/currency/usd_try_rates.json',
    '../../data/currency/usd_try_rates.json',
    '/data/currency/usd_try_rates.json'
  ];

  let cachedUsdTryData = null;
  let loadPromise = null;
  let hasWarnedAboutLoadFailure = false;

  function warnOnce(message) {
    if (hasWarnedAboutLoadFailure) return;

    hasWarnedAboutLoadFailure = true;
    console.warn(`[TeknoifyExchangeRates] ${message}`);
  }

  function normalizeDateString(dateString) {
    if (typeof dateString !== 'string') return null;

    const trimmedDate = dateString.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmedDate) ? trimmedDate : null;
  }

  function getValidRates(data) {
    if (!data || !Array.isArray(data.rates)) return [];

    return data.rates.filter((rate) => {
      return (
        normalizeDateString(rate?.date) &&
        Number.isFinite(rate?.usdTry) &&
        (!rate.source || typeof rate.source === 'string')
      );
    });
  }

  async function fetchRatesFromCandidates() {
    for (const dataPath of dataPathCandidates) {
      try {
        const response = await fetch(dataPath, { cache: 'no-cache' });

        if (!response.ok) continue;

        return await response.json();
      } catch {
        // Try the next relative path candidate; warn only if every candidate fails.
      }
    }

    warnOnce('Unable to load USD/TRY rate data. Returning null for exchange-rate lookups.');
    return null;
  }

  async function loadUsdTryRates() {
    if (cachedUsdTryData) return cachedUsdTryData;

    if (!loadPromise) {
      loadPromise = fetchRatesFromCandidates().then((data) => {
        cachedUsdTryData = data;
        return cachedUsdTryData;
      });
    }

    return loadPromise;
  }

  async function getUsdTryRateByDate(dateString) {
    const targetDate = normalizeDateString(dateString);
    if (!targetDate) return null;

    const data = await loadUsdTryRates();
    const rate = getValidRates(data).find((item) => item.date === targetDate);

    return rate ?? null;
  }

  async function getClosestUsdTryRate(dateString) {
    const targetDate = normalizeDateString(dateString);
    if (!targetDate) return null;

    const data = await loadUsdTryRates();
    const eligibleRates = getValidRates(data)
      .filter((rate) => rate.date <= targetDate)
      .sort((firstRate, secondRate) => secondRate.date.localeCompare(firstRate.date));

    return eligibleRates[0] ?? null;
  }

  async function getPeriodAverageUsdTry(startDate, endDate) {
    const normalizedStartDate = normalizeDateString(startDate);
    const normalizedEndDate = normalizeDateString(endDate);

    if (!normalizedStartDate || !normalizedEndDate || normalizedStartDate > normalizedEndDate) {
      return null;
    }

    const data = await loadUsdTryRates();
    const periodRates = getValidRates(data).filter((rate) => {
      return rate.date >= normalizedStartDate && rate.date <= normalizedEndDate;
    });

    if (!periodRates.length) return null;

    const totalRate = periodRates.reduce((sum, rate) => sum + rate.usdTry, 0);
    return totalRate / periodRates.length;
  }

  async function getQuarterAverageUsdTry(year, quarter) {
    const normalizedYear = Number(year);
    const normalizedQuarter = Number(quarter);

    if (
      !Number.isInteger(normalizedYear) ||
      !Number.isInteger(normalizedQuarter) ||
      normalizedQuarter < 1 ||
      normalizedQuarter > 4
    ) {
      return null;
    }

    const quarterStartMonth = (normalizedQuarter - 1) * 3 + 1;
    const quarterEndMonth = quarterStartMonth + 2;
    const startDate = `${normalizedYear}-${String(quarterStartMonth).padStart(2, '0')}-01`;
    const endDate = new Date(Date.UTC(normalizedYear, quarterEndMonth, 0))
      .toISOString()
      .slice(0, 10);

    return getPeriodAverageUsdTry(startDate, endDate);
  }

  window.TeknoifyExchangeRates = {
    loadUsdTryRates,
    getUsdTryRateByDate,
    getClosestUsdTryRate,
    getQuarterAverageUsdTry,
    getPeriodAverageUsdTry
  };
})();
