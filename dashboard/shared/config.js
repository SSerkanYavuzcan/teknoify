/**
 * dashboard/shared/config.js
 * Tek kaynak konfig.
 *
 * Kullanım:
 *  - Her dashboard sayfasında auth.js'den ÖNCE şunu set et:
 *      <script>window.TK_PROJECT_ID="bim_istekleri";</script>
 *    (veya entitlements'taki id neyse)
 *
 *  - Opsiyonel servis parametreleri:
 *      window.TK_SERVICE = { pageTitle, apiEndpoint, exportFileName, ... }
 *
 * Üretilen global:
 *   window.PROJECT_CONFIG = {
 *     projectId, pageTitle, apiEndpoint,
 *     basePath, rootPath,
 *     ...
 *   }
 */

(function () {
  // -------------------- helpers --------------------
  function safeStr(v) {
    return String(v == null ? "" : v).trim();
  }

  function joinPath(a, b) {
    const A = safeStr(a);
    const B = safeStr(b);
    if (!A) return B || "/";
    if (!B) return A;
    return (A.endsWith("/") ? A.slice(0, -1) : A) + "/" + (B.startsWith("/") ? B.slice(1) : B);
  }

  // Bulunduğumuz sayfanın /dashboard/... altındaki konumuna göre kökü hesapla
  // Örn: /dashboard/bim-istekleri/index.html -> base="/dashboard/", root="/"
  function computePaths() {
    const p = (window.location.pathname || "/").split("?")[0].split("#")[0];

    // dashboard kökü her zaman /dashboard/ kabul
    const basePath = "/dashboard/";

    // rootPath her zaman site kökü
    const rootPath = "/";

    // İstersen ileride farklı hostlarda da çalışsın diye origin tutalım
    const origin = window.location.origin || "";

    return { basePath, rootPath, origin, pathname: p };
  }

  // -------------------- read per-page config --------------------
  const { basePath, rootPath, origin, pathname } = computePaths();

  // Her sayfa bunu set etmeli:
  const projectId = safeStr(window.TK_PROJECT_ID);

  // Opsiyonel servis override
  const svc = (window.TK_SERVICE && typeof window.TK_SERVICE === "object") ? window.TK_SERVICE : {};

  // Defaultlar (quickcommerce config'inden ilhamla)
  const defaults = {
    pageTitle: "Dashboard",
    exportFileName: "teknoify_export",
    ourStoreLabel: "Biz",
    apiEndpoint: "", // servis yoksa boş
  };

  // PROJECT_CONFIG üret
  window.PROJECT_CONFIG = Object.assign(
  {},
  window.PROJECT_CONFIG || {},   // önce varsa onu koru
  {
    projectId: projectId || (window.PROJECT_CONFIG?.projectId ?? "unknown_project"),
    pageTitle: safeStr(svc.pageTitle) || window.PROJECT_CONFIG?.pageTitle || defaults.pageTitle,
    exportFileName: safeStr(svc.exportFileName) || window.PROJECT_CONFIG?.exportFileName || defaults.exportFileName,
    ourStoreLabel: safeStr(svc.ourStoreLabel) || window.PROJECT_CONFIG?.ourStoreLabel || defaults.ourStoreLabel,
    apiEndpoint: safeStr(svc.apiEndpoint) || window.PROJECT_CONFIG?.apiEndpoint || defaults.apiEndpoint,
    basePath,
    rootPath,
    origin,
    pathname,
    service: svc || window.PROJECT_CONFIG?.service || {},
  }
);
