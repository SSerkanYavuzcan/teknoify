import { auth, db, app } from "/js/lib/firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-check.js";

// ================================================================
// APP CHECK BAŞLATMA
// ================================================================
if (app) {
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('6LetmtgsAAAAAHOxEkJG4sa29oKLNnAZjQZ1dAwk'),
        isTokenAutoRefreshEnabled: true
    });
}

const IMPERSONATE_UID_KEY = "teknoify_impersonate_uid";

// ================================================================
// GÜVENLİK DUVARI (BAN KONTROLÜ)
// ================================================================
function checkSecurityBan() {
    if (localStorage.getItem('tk_access_denied') === 'true') {
        document.documentElement.innerHTML = `
        <div style="background:#05080a; color:white; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
            <h1 style="color:#ff4b4b; font-size:4rem; margin-bottom:0;">403</h1>
            <h2 style="margin-top:10px;">Erişim Reddedildi</h2>
        </div>`;
        window.stop();
        return true;
    }
    return false;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getLoginPath() {
  const p = window.location.pathname || "";
  if (p.includes("/dashboard/")) return "../pages/login.html";
  return "pages/login.html";
}

function getDashboardPath(roleType = "member") {
  const p = window.location.pathname || "";
  const prefix = (p.includes("/dashboard/") || p.includes("/pages/")) ? "" : "dashboard/";
  if (roleType === "admin") return prefix + "index.html";
  return prefix + roleType + ".html";
}

async function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });
}

async function readUserDocument(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data();
  } catch (err) {
    console.error("🚨 KRİTİK: Firestore'dan veri çekilemedi (Permission Denied olabilir):", err);
    return null;
  }
}

async function buildRealSession(user) {
  const uid = user.uid;
  const userDoc = await readUserDocument(uid);
  
  const roleData = userDoc?.role || { type: "member", status: "active" };
  const profileData = userDoc?.profile || {};
  
  return {
    uid,
    email: normalizeEmail(user.email),
    name: profileData.fullName || user.email.split("@")[0],
    role: roleData, 
    isAdmin: roleData.type === "admin",
    issuedAt: Date.now()
  };
}

async function getEffectiveSession(realSession) {
  const targetUid = window.localStorage.getItem(IMPERSONATE_UID_KEY);
  if (!realSession.isAdmin || !targetUid) return { ...realSession, impersonating: false };

  const targetDoc = await readUserDocument(targetUid);
  if (!targetDoc) {
    window.localStorage.removeItem(IMPERSONATE_UID_KEY);
    return { ...realSession, impersonating: false };
  }

  return {
    ...realSession,
    uid: targetUid,
    role: targetDoc.role || { type: "member", status: "active" },
    impersonating: true,
    realIsAdmin: true
  };
}

export async function logout() {
  window.localStorage.removeItem(IMPERSONATE_UID_KEY);
  await signOut(auth);
  window.location.replace("/");
}

/**
 * requireAuth: TEST MODU AKTİF (Redirect Kapatıldı)
 */
export async function requireAuth({ allowedRoles = [] } = {}) {
  console.log("--- REQUIRE_AUTH BAŞLATILDI ---");
  
  if (checkSecurityBan()) return null;

  const user = await waitForAuthUser();

  // 🚨 DİKKAT: Sorunu bulmak için yönlendirmeyi durdurduk
  if (!user) {
    console.error("🚨 HATA: Firebase Auth kullanıcısı bulunamadı (User = null).");
    console.warn("Lütfen 'Preserve Log' açıkken giriş yapmayı deneyin ve buradaki hata mesajına bakın.");
    // window.location.href = getLoginPath(); // Geçici olarak pasif
    return null;
  }

  const real = await buildRealSession(user);
  const effective = await getEffectiveSession(real);

  console.log("Oturum Doğrulandı:", effective);

  if (allowedRoles.length > 0 && !allowedRoles.includes(effective.role.type)) {
    console.warn("Yetki Yetersiz. Gerekli Rol:", allowedRoles, "Kullanıcı Rolü:", effective.role.type);
    // window.location.href = getDashboardPath(effective.role.type); // Geçici olarak pasif
    return null;
  }

  return effective;
}
