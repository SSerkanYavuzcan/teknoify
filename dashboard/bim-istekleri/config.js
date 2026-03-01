/**
 * dashboard/bim-istekleri/config.js
 * BIM API Console - Secure config (NO SECRETS IN CLIENT)
 */

(function () {
  const ORIGIN = window.location.origin;

  const PROJECT_CONFIG = {
    projectId: "bim_faz_2",
    pageTitle: "API Console",

    // Backend (Cloud Function / Cloud Run function)
    apiEndpoint: "https://us-central1-teknoify-9449c.cloudfunctions.net",
    proxyPath: "/apiProxy",

    basePath: "/dashboard/",
    rootPath: "/",
    homePath: "/dashboard/member.html",

    // Console defaults: point to the SAME backend endpoint
    console: {
      defaultUrl: "https://us-central1-teknoify-9449c.cloudfunctions.net/apiProxy",
      defaultMethod: "POST",
      defaultHeaders: [{ key: "content-type", value: "application/json" }],
      defaultBody: '{\n  "orderId": "pnu2-y3h8",\n  "project_id": "bim_faz_2"\n}',
      enableBigQueryPreview: false,
    },

    // BIM flow: same endpoint (no extra path)
    bimFlow: {
      resolveCustomerInfoPath: "/apiProxy",
      runCustomerInfoPath: "/apiProxy",
      defaultDate: "",
      defaultOrderId: "pnu2-y3h8",
    },

    security: {
      clientOrigin: ORIGIN,
      noLocalTokenStorage: true,
    },
  };

  window.PROJECT_CONFIG = PROJECT_CONFIG;
})();
