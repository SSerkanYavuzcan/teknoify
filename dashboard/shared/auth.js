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
      authUrl: "demo/market-analysis/index.html", 
      promoUrl: "demo/market-analysis/index.html" 
    },
    {
      id: "web_scraping",
      title: "Web Scraping",
      icon: "fas fa-spider",
      authUrl: "web-scraping/quickcommerce/index.html",
      promoUrl: "web-scraping/quickcommerce/index.html"
    },
    {
      id: "geo_intelligence",
      title: "Geo Intelligence",
      icon: "fas fa-map-marked-alt",
      authUrl: "geo-intelligence/index.html",
      promoUrl: "geo-intelligence/index.html"
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

  // URL'den imp_uid yakalayan gelişmiş fonksiyon
  function getImpersonatedUid() {
    // 1. Önce URL'den bak (Admin linkle yönlendirmişse)
    const urlParams = new URLSearchParams(window.location.search);
    const urlUid = urlParams.get('imp_uid');
    
    if (urlUid) {
        localStorage.setItem("teknoify_impersonate_uid", urlUid);
        return urlUid;
    }

    // 2. URL'de yoksa Storage'a bak
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
      String(profile?.fullName || profile?.name || "").trim() ||
      String(user?.displayName || "").trim() ||
      (email ? email.split("@")[0] : "Kullanıcı")
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

  // -------------------- YENİ: Impersonation Banner Ekleme --------------------
  function renderImpersonationBanner() {
    const currentImpUid = getImpersonatedUid();
    if (!currentImpUid) return;

    if (document.getElementById("imp-banner-wrap")) return;

    const banner = document.createElement("div");
    banner.id = "imp-banner-wrap";
    banner.className = "impersonation-warning";
    banner.style.cssText = "background: #f59e0b; color: #fff; padding: 10px; text-align: center; font-weight: 500; font-size: 0.9rem; z-index: 9999; position: sticky; top: 0; display: flex; justify-content: center; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.5); width: 100%;";
    
    banner.innerHTML = `
        <span><i class="fa-solid fa-user-secret"></i> Şu an farklı bir kullanıcı görünümündesiniz (Admin Modu).</span>
        <button id="btn-end-imp" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: 0.2s;">Geri Dön</button>
    `;
    
    document.body.prepend(banner);

    document.getElementById("btn-end-imp").onclick = () => {
        clearImpersonation();
        const cfg = window.PROJECT_CONFIG || { basePath: "/dashboard/" };
        window.location.href = joinPath(cfg.basePath || "/dashboard/", "admin");
    };
  }

  // -------------------- Firestore Reads --------------------
  async function readUserProfile(uid) {
    try {
      const snap = await db.collection("users").doc(uid).get();
      if(snap.exists) {
          const data = snap.data();
          // Eğer profil bilgileri 'profile' objesi içindeyse onu da döndür
          return data.profile ? {...data, ...data.profile} : data;
      }
      return {};
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
      if (prof.role === "admin" || prof.isAdmin === true || prof.role?.type === "admin") return true;
    } catch {}

    return false;
  }

  // Firebase'in yeni yapısına uygun entitlement okuyucu
  async function readEntitlements(uid) {
    try {
        // Yeni yapıda yetkiler doğrudan users > projectAccess içinde olabilir
        const userDoc = await db.collection("users").doc(uid).get();
        if(userDoc.exists) {
            const data = userDoc.data();
            const projectAccess = data.projectAccess || {};
            const allowedIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
            
            // Eğer yeni yapıda yetki varsa onu döndür
            if(allowedIds.length > 0) {
                return { projectIds: allowedIds, allowedStoresByProject: {}, allowedStoresGlobal: [] };
            }
        }

        // Eski entitlements koleksiyonu fallback
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
        const impersonatedUid = getImpersonatedUid(); // URL veya LocalStorage'dan UID çeker
        const isImpersonatingRequested = Boolean(impersonatedUid && impersonatedUid !== realUid);
        const realIsAdmin = await isAdmin(realUid, user);

        let effectiveUid = realUid;
        let isImpersonating = false;

        if (realIsAdmin && isImpersonatingRequested) {
          effectiveUid = impersonatedUid;
          isImpersonating = true;
          renderImpersonationBanner(); // Turuncu Banner'ı Çiz
        } else if (!realIsAdmin && isImpersonatingRequested) {
          clearImpersonation();
        }

        const effectiveProfile = await readUserProfile(effectiveUid);
        const displayName = computeDisplayName(effectiveProfile, user);
        
        applyUserUI(displayName);

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
          projectIds: ent.projectIds || [], 
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

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("tk-logout-modal")) {
      const modalHTML = `
        <div id="tk-logout-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 99999; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
          <div style="background: #18181b; padding: 30px; border-radius: 12px; text-align: center; border: 1px solid #3f3f46; color: white; width: 90%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h3 style="margin-top: 0; font-size: 1.5rem;">Çıkış Yap</h3>
            <p style="color: #a1a1aa; margin-bottom: 24px;">Hesabınızdan veya taklit modundan çıkış yapmak istediğinize emin misiniz?</p>
            <div style="display: flex; justify-content: center; gap: 12px;">
              <button onclick="window.closeLogoutModal()" style="padding: 10px 20px; background: transparent; border: 1px solid #3f3f46; color: white; border-radius: 6px; cursor: pointer; font-weight: bold;">İptal</button>
              <button onclick="window.executeLogout()" style="padding: 10px 20px; background: #ef4444; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: bold;"><i class="fas fa-power-off"></i> Çıkış Yap</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
  });

  window.logout = function (e) {
    if (e) e.preventDefault();
    const modal = document.getElementById("tk-logout-modal");
    if (modal) modal.style.display = "flex"; // CSS class yerine doğrudan göster
  };

  window.closeLogoutModal = function () {
    const modal = document.getElementById("tk-logout-modal");
    if (modal) modal.style.display = "none";
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
