import {
    ALL_ROUTES,
    DASHBOARD_ROUTES,
    LEGAL_ROUTES,
    PRODUCT_ROUTES,
    PUBLIC_ROUTES,
    getDashboardRouteForRole
} from '/packages/config/routes.js';

const routeBridge = Object.freeze({
    all: ALL_ROUTES,
    dashboard: DASHBOARD_ROUTES,
    legal: LEGAL_ROUTES,
    products: PRODUCT_ROUTES,
    public: PUBLIC_ROUTES,
    getDashboardRouteForRole
});

if (!window.TEKNOIFY_ROUTES) {
    Object.defineProperty(window, 'TEKNOIFY_ROUTES', {
        value: routeBridge,
        writable: false,
        configurable: false,
        enumerable: false
    });
}
