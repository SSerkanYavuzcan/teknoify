/**
 * dashboard/shared/auth.js (Firebase compat)
 */

(function () {
  // ========================================================================
  // 1. SİSTEMDEKİ TÜM HİZMETLERİN LİSTESİ (AYARLAR BURADAN YAPILIR)
  // ========================================================================
  window.TK_SERVICES_CONFIG = [
    {
      id: "bim_faz_2", // Firebase'deki tam ID
      title: "API Service",
      icon: "fas fa-bolt",
      authUrl: "bim-istekleri/index.html", 
      promoUrl: "bim-istekleri/demo.html" 
    },
    {
      id: "market_analysis",
      title: "Pazar Analizi",
      icon: "fas fa-chart-line",
      authUrl: "demo/market-analysis/index.html", // Şimdilik authUrl ve promoUrl aynı yere gidiyor
      promoUrl: "demo/market-analysis/index.html" 
    }
  ];

  // -------------------- Firebase Init --------------------
  const _FIREBASE_CONFIG = {
    apiKey: "AIzaSyC1Id7kdU23_A7fEO1eDna0HKprvIM30E8",
    authDomain: "teknoify-9449c.firebaseapp.com",
    projectId: "teknoify-9449c",
    storageBucket: "teknoify-9449c.firebasestorage.app",
    messagingSenderId: "704314596026",
    appId: "1:704314596026:web:f63fff04c00b7a698ac083",
    measurementId: "G-1DZKJE7BXE",
  };

  if (!window.firebase) {
    console.error("[auth] Firebase compat not loaded.");
    return;
  }

  if (!firebase.apps.length) firebase.initializeApp(_FIREBASE_CONFIG);

  const auth = firebase.auth();
  const db = firebase.firestore();

  window.auth = window.auth || auth;
  window.db = window.db || db;

  // -------------------- Helpers --------------------
  function safeLower(s) {
    return String(s || "").trim().toLowerCase();
  }

  function joinPath(a, b) {
    const A = String(a || "").trim();
    const B = String(b || "").trim();
    if (!A) return B || "/";
    if (!B) return A;
    return (A.endsWith("/") ? A.slice(0, -1) : A) + "/" + (B.startsWith("/") ? B.slice(1) : B);
  }

  function getImpersonatedUid() {
    return (
      localStorage.getItem("teknoify_impersonate_uid") ||
      localStorage.getItem("tk_impersonate_uid") ||
      localStorage.getItem("impersonate_uid") ||
      localStorage.getItem("impersonateUid") ||
      sessionStorage.getItem("teknoify_impersonate_uid") ||
      sessionStorage.getItem("tk_impersonate_uid") ||
      sessionStorage.getItem("impersonate_uid") ||
      sessionStorage.getItem("impersonateUid") ||
      ""
    );
  }

  function clearImpersonation() {
    ["teknoify_impersonate_uid", "tk_impersonate_uid", "impersonate_uid", "impersonateUid"].forEach((k) => {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch {}
    });
  }

  function computeDisplayName(profile, user) {
    const email = safeLower(user?.email);
    return (
      String(profile?.name || "").trim() ||
      String(user?.displayName || "").trim() ||
      (email ? email.split("@")[0] : "User")
    );
  }

  function applyUserUI(displayName) {
    const nameEl = document.getElementById("user-name-display");
    const avatarEl = document.getElementById("user-avatar");
    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = (displayName || "U").charAt(0).toUpperCase();
  }

  function redirectToLogin() {
    const cfg = window.PROJECT_CONFIG || { rootPath: "/" };
    const loginUrl = joinPath(cfg.rootPath || "/", "pages/login.html");
    window.location.href = loginUrl;
  }

  function redirectToHome() {
    const cfg = window.PROJECT_CONFIG || { rootPath: "/" };
    const homeUrl = joinPath(cfg.rootPath || "/", "index.html");
    window.location.href = homeUrl;
  }

  function redirectToMemberFallback() {
    const cfg = window.PROJECT_CONFIG || { basePath: "/dashboard/" };
    const fallback = joinPath(cfg.basePath || "/dashboard/", "member.html");
    window.location.href = fallback;
  }

  // -------------------- Firestore Reads --------------------
  async function readUserProfile(uid) {
    try {
      const snap = await db.collection("users").doc(uid).get();
      return snap.exists ? snap.data() || {} : {};
    } catch {
      return {};
    }
  }

  async function isAdmin(uid, userForClaimsFallback) {
    try {
      const snap = await db.collection("admins").doc(uid).get();
      if (snap.exists) return true;
    } catch {}

    try {
      const u = userForClaimsFallback || auth.currentUser;
      if (u && u.uid === uid && typeof u.getIdTokenResult === "function") {
        const tr = await u.getIdTokenResult(true);
        const c = tr?.claims || {};
        if (c.admin === true) return true;
        if (c.role === "admin") return true;
      }
    } catch {}

    try {
      const prof = await readUserProfile(uid);
      if (prof.role === "admin" || prof.isAdmin === true) return true;
    } catch {}

    return false;
  }

  async function readEntitlements(uid) {
    try {
      const snap = await db.collection("entitlements").doc(uid).get();
      if (!snap.exists) return { projectIds: [], allowedStoresByProject: {}, allowedStoresGlobal: [] };

      const data = snap.data() || {};
      const projectIds = Array.isArray(data.projectIds) ? data.projectIds : [];
      const projectStores = data.projectStores || data.projectStoreAccess || {};
      const allowedStoresGlobal = Array.isArray(data.allowedStores) ? data.allowedStores : [];

      return { projectIds, allowedStoresByProject: projectStores, allowedStoresGlobal };
    } catch {
      return { projectIds: [], allowedStoresByProject: {}, allowedStoresGlobal: [] };
    }
  }

  function resolveAllowedStores(ent, projectId) {
    const byProject = ent.allowedStoresByProject || {};
    const storesByProject = Array.isArray(byProject?.[projectId]) ? byProject[projectId] : [];
    if (storesByProject.length) return storesByProject;
    return Array.isArray(ent.allowedStoresGlobal) ? ent.allowedStoresGlobal : [];
  }

  // ========================================================================
  // DİNAMİK SİDEBAR RENDER SİSTEMİ 
  // ========================================================================
  window.TK_RENDER_SIDEBAR = function() {
    const container = document.getElementById("dynamic-services-menu");
    if (!container) return; 

    const userProjectIds = window.USER_SESSION?.projectIds || [];
    const basePath = (window.PROJECT_CONFIG && window.PROJECT_CONFIG.basePath) ? window.PROJECT_CONFIG.basePath : "/dashboard/";

    const owned = window.TK_SERVICES_CONFIG.filter(s => userProjectIds.includes(s.id));
    const locked = window.TK_SERVICES_CONFIG.filter(s => !userProjectIds.includes(s.id));

    let html = '';

    // 1. SAHİP OLUNAN HİZMETLER
    owned.forEach(s => {
      const fullUrl = joinPath(basePath, s.authUrl);
      const isActive = window.location.pathname.includes(s.authUrl) ? "active" : "";
      html += `
        <a href="${fullUrl}" class="menu-item ${isActive}">
          <i class="${s.icon}"></i> <span>${s.title}</span>
        </a>
      `;
    });

    // 2. KİLİTLİ / DEMO HİZMETLER
    if (locked.length > 0) {
      html += `<div style="margin-top:15px;margin-bottom:5px;padding-left:16px;font-size:0.7rem;color:#666;font-weight:700;text-transform:uppercase;">Keşfet</div>`;
      locked.forEach(s => {
        const fullUrl = joinPath(basePath, s.promoUrl);
        const isActive = window.location.pathname.includes(s.promoUrl) ? "active" : "";
        html += `
          <a href="${fullUrl}" class="menu-item ${isActive}" style="opacity: 0.7;">
            <i class="${s.icon}"></i> <span>${s.title}</span>
            <i class="fas fa-lock" style="margin-left:auto; font-size:0.75rem; opacity:0.5; color:#f97316;"></i>
          </a>
        `;
      });
    }

    container.innerHTML = html;
  };

  // -------------------- Bootstrap --------------------
  async function bootstrap() {
    const cfg = window.PROJECT_CONFIG || {
      projectId: "",
      basePath: "/dashboard/",
      rootPath: "/",
    };

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        redirectToLogin();
        return;
      }

      try {
        const realUid = user.uid;
        const impersonatedUid = getImpersonatedUid();
        const isImpersonatingRequested = Boolean(impersonatedUid && impersonatedUid !== realUid);
        const realIsAdmin = await isAdmin(realUid, user);

        let effectiveUid = realUid;
        let isImpersonating = false;

        if (realIsAdmin && isImpersonatingRequested) {
          effectiveUid = impersonatedUid;
          isImpersonating = true;
        } else if (!realIsAdmin && isImpersonatingRequested) {
          clearImpersonation();
        }

        const effectiveProfile = await readUserProfile(effectiveUid);
        const displayName = computeDisplayName(effectiveProfile, user);
        applyUserUI(displayName);

        // ==============================================================
        // DÜZELTME: Veritabanından yetkileri (entitlements) HER ZAMAN ÇEK!
        // ==============================================================
        const entitlementUid = isImpersonating ? effectiveUid : realUid;
        const ent = await readEntitlements(entitlementUid); 
        
        let entitled = true;
        // Eğer kullanıcı bir proje sayfasındaysa (cfg.projectId varsa) yetkisini kontrol et
        if (cfg.projectId) {
          if (realIsAdmin && !isImpersonating) {
            entitled = true;
          } else {
            entitled = (ent.projectIds || []).includes(cfg.projectId);
          }
        }

        // Eğer projedeyse ve yetkisi yoksa demo'ya at
        if (!entitled && cfg.projectId) {
          const matchedService = window.TK_SERVICES_CONFIG.find(s => s.id === cfg.projectId);
          if (matchedService && matchedService.promoUrl) {
            if (!window.location.pathname.includes(matchedService.promoUrl)) {
                window.location.href = joinPath(cfg.basePath || "/dashboard/", matchedService.promoUrl);
                return;
            }
          } else {
            redirectToMemberFallback();
            return;
          }
        }

        const allowedStores = cfg.projectId ? resolveAllowedStores(ent, cfg.projectId) : [];

        window.USER_ALLOWED_STORES = allowedStores;
        window.USER_EFFECTIVE_UID = effectiveUid;
        window.USER_IS_IMPERSONATING = realIsAdmin && isImpersonating;

        window.USER_SESSION = {
          uid: realUid,
          effectiveUid,
          email: safeLower(user.email),
          name: displayName,
          isAdmin: realIsAdmin,
          impersonating: realIsAdmin && isImpersonating,
          projectIds: ent.projectIds || [], // BURASI ARTIK DOLU GELECEK!
          allowedStores,
        };

        // Oturum başarılı, Dinamik Menüyü çiz
        try {
          if (typeof window.TK_RENDER_SIDEBAR === "function") {
            window.TK_RENDER_SIDEBAR();
          }
        } catch (e) {
          console.warn("[auth] sidebar render failed:", e);
        }

        if (typeof window.initCalendar === "function") {
          window.initCalendar();
        }

        if (typeof window.TK_INIT_REQUEST_CONSOLE === "function") {
          window.TK_INIT_REQUEST_CONSOLE();
        }
      } catch (err) {
        console.error("[auth] Bootstrap error:", err);
      }
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".multi-select-wrapper")) {
        document.querySelectorAll(".multi-select-menu").forEach((m) => m.classList.remove("show"));
      }
      const wrapper = document.querySelector(".download-wrapper");
      const menu = document.getElementById("download-menu");
      if (wrapper && menu && !wrapper.contains(e.target)) menu.classList.remove("show");
    });
  }

  // ========================================================================
  // GLOBAL ÇIKIŞ MODAL SİSTEMİ
  // ========================================================================
  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("tk-logout-modal")) {
      const modalHTML = `
        <div id="tk-logout-modal" class="tk-modal-overlay">
          <div class="tk-modal">
            <i class="fas fa-sign-out-alt tk-modal-icon"></i>
            <div class="tk-modal-title">Çıkış Yap</div>
            <div class="tk-modal-text">Hesabınızdan çıkış yapmak istediğinize emin misiniz?</div>
            <div class="tk-modal-actions">
              <button class="tk-btn-cancel" onclick="window.closeLogoutModal()">İptal</button>
              <button class="tk-btn-confirm" onclick="window.executeLogout()"><i class="fas fa-power-off"></i> Çıkış</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
  });

  window.logout = function () {
    const modal = document.getElementById("tk-logout-modal");
    if (modal) modal.classList.add("show");
  };

  window.closeLogoutModal = function () {
    const modal = document.getElementById("tk-logout-modal");
    if (modal) modal.classList.remove("show");
  };

  window.executeLogout = function () {
    clearImpersonation();
    auth.signOut()
      .catch(() => {})
      .finally(() => {
        redirectToHome(); 
      });
  };

  window.toggleSidebar =
    window.toggleSidebar ||
    function () {
      document.body.classList.toggle("sidebar-closed");
    };

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
