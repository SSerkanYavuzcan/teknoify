// Public URL contract of the teknoify.com marketing site.
//
// Not loaded by any page since Phase B0; kept as the single documented source of the current public route
// strings for the redesign phases. Authenticated product surfaces live on the platform and are not routes
// of this site: legacy /dashboard/* and login URLs are redirect rules in public/_redirects.

export const PLATFORM_ROUTES = Object.freeze({
    // Only the platform root is a verified public URL. Deep links (sign-in, reset, tools) are PLATFORM TARGET TBD.
    root: 'https://platform.teknoify.com/'
});

export const PUBLIC_ROUTES = Object.freeze({
    home: '/',
    subscription: '/pages/subscription.html',
    demo: '/demo/'
});

export const PRODUCT_ROUTES = Object.freeze({
    api: '/pages/api.html',
    rpa: '/pages/rpa.html',
    webScraping: '/pages/webscraping.html',
    aiAssistant: '/pages/ai-assistant.html',
    financialIndicators: '/pages/financial-indicators.html',
    trainingConsulting: '/pages/training-consulting.html'
});

export const INVESTMENT_ROUTES = Object.freeze({
    investmentAnalytics: '/pages/investment-analytics.html'
});

export const LEGAL_ROUTES = Object.freeze({
    privacy: '/pages/gizlilik.html',
    terms: '/pages/kullanim-sartlari.html',
    kvkk: '/pages/kvkk.html',
    serviceAgreement: '/pages/hizmet-sozlesmesi.html'
});

export const ALL_ROUTES = Object.freeze({
    platform: PLATFORM_ROUTES,
    public: PUBLIC_ROUTES,
    legal: LEGAL_ROUTES,
    products: PRODUCT_ROUTES,
    investments: INVESTMENT_ROUTES
});
