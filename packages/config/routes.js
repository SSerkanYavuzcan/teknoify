export const PUBLIC_ROUTES = Object.freeze({
    home: '/',
    login: '/pages/login.html',
    subscription: '/pages/subscription.html',
    impersonate: '/pages/impersonate.html',
    unauthorized: '/pages/unauthorized.html',
    resetPassword: '/reset-password.html'
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
    investmentAnalytics: '/pages/investment-analytics.html',
    investmentRetail: '/pages/investment-retail.html',
    investmentAirlines: '/pages/investment-airlines.html'
});

export const LEGAL_ROUTES = Object.freeze({
    privacy: '/pages/gizlilik.html',
    terms: '/pages/kullanim-sartlari.html',
    kvkk: '/pages/kvkk.html',
    serviceAgreement: '/pages/hizmet-sozlesmesi.html'
});

export const DASHBOARD_ROUTES = Object.freeze({
    root: '/dashboard/index.html',
    member: '/dashboard/member.html',
    premium: '/dashboard/premium.html',
    admin: '/dashboard/admin.html',
    adminExtensionless: '/dashboard/admin',
    analysis: '/dashboard/analysis.html',
    marketAnalysis: '/dashboard/market-analysis.html',
    marketAnalysisDemo: '/dashboard/market-analysis-demo.html',
    quickCommerce: '/dashboard/web-scraping/quickcommerce/index.html',
    clothesScraping: '/dashboard/web-scraping/clothes/index.html',
    foodScraping: '/dashboard/web-scraping/food/index.html',
    productDiscover: '/dashboard/agents/product-discover/index.html',
    bimRequests: '/dashboard/bim-istekleri/index.html',
    geoIntelligence: '/dashboard/geo-intelligence/index.html',
    marketAnalysisDemoProject: '/dashboard/demo/market-analysis/index.html',
    memberFinance: '/dashboard/member/finance/index.html',
    memberHealth: '/dashboard/member/health/index.html',
    memberProductivity: '/dashboard/member/productivity/index.html',
    memberSubscriptions: '/dashboard/member/subscriptions/index.html'
});

export const ALL_ROUTES = Object.freeze({
    public: PUBLIC_ROUTES,
    dashboard: DASHBOARD_ROUTES,
    legal: LEGAL_ROUTES,
    products: PRODUCT_ROUTES,
    investments: INVESTMENT_ROUTES
});

export function getDashboardRouteForRole(roleType) {
    if (roleType === 'admin') return DASHBOARD_ROUTES.admin;
    if (roleType === 'premium') return DASHBOARD_ROUTES.premium;
    return DASHBOARD_ROUTES.member;
}
