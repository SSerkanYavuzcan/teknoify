import { auth, db } from "/js/lib/firebase.js";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const IMPERSONATE_UID_KEY = "teknoify_impersonate_uid";

// ================================================================
// GÜVENLİK DUVARI (BAN KONTROLÜ)
// ================================================================
function checkSecurityBan() {
    if (localStorage.getItem('tk_access_denied') === 'true') {
        // Eğer cihaz banlıysa içeriği temizle ve engelleme ekranını bas
        document.documentElement.innerHTML = `
        <div style="background:#05080a; color:white; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
            <h1 style="color:#ff4b4b; font-size:4rem; margin-bottom:0;">403</h1>
            <h2 style="margin-top:10px;">Erişim Reddedildi</h2>
            <p style="color:#a1a1aa; max-width:500px;">Güvenlik politikalarımız ihlal edildiği için bu siteye erişiminiz kalıcı olarak engellenmiştir.</p>
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
  if (p.includes("/pages/")) return "login.html";
  return "pages/login.html";
}

function getDashboardPath(roleType = "member") {
  const p = window.location.pathname || "";
  const prefix = (p.includes("/dashboard/") || p.includes("/pages/")) ? "../dashboard/" : "dashboard/";
  
  if (roleType === "admin") return prefix + "admin.html";
  if (roleType === "premium") return prefix + "premium.html";
  return prefix + "member.html";
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
    console.error("Kullanıcı verisi okunamadı:", err);
    return null;
  }
}

function computeFallbackName(user) {
  const email = normalizeEmail(user?.email);
  if (user?.displayName) return user.displayName;
  if (email) return email.split("@")[0];
  return "User";
}

async function buildRealSession(user) {
  const uid = user.uid;
  const email = normalizeEmail(user.email);

  const userDoc = await readUserDocument(uid);
  
  const roleData = userDoc?.role || { type: "member", status: "active" };
  const profileData = userDoc?.profile || {};
  const projectAccess = userDoc?.projectAccess || {};
  
  const name = profileData.fullName || computeFallbackName(user);
  const isAdmin = roleData.type === "admin";

  return {
    userId: uid,
    uid,
    email,
    name,
    profile: profileData,
    role: roleData, 
    projectAccess,
    isAdmin,
    issuedAt: Date.now()
  };
}

export function stopImpersonation({ redirect = true } = {}) {
  window.localStorage.removeItem(IMPERSONATE_UID_KEY);
  if (redirect) window.location.href = getDashboardPath("admin");
}

export async function startImpersonation(targetUid, { to } = {}) {
  const user = await waitForAuthUser();
  if (!user) return { ok: false, message: "Oturum yok." };

  const real = await buildRealSession(user);
  if (!real.isAdmin) return { ok: false, message: "Sadece adminler impersonate başlatabilir." };
  if (!targetUid) return { ok: false, message: "Hedef kullanıcı boş olamaz." };
  if (targetUid === real.uid) return { ok: false, message: "Kendi hesabını impersonate edemezsin." };

  const targetDoc = await readUserDocument(targetUid);
  if (!targetDoc) return { ok: false, message: "Hedef kullanıcı veritabanında bulunamadı." };

  window.localStorage.setItem(IMPERSONATE_UID_KEY, targetUid);
  if (to) window.location.href = to;
  return { ok: true, targetUid };
}

async function getEffectiveSession(realSession) {
  if (!realSession.isAdmin) {
    return { ...realSession, impersonating: false, realIsAdmin: false };
  }

  const targetUid = window.localStorage.getItem(IMPERSONATE_UID_KEY);
  if (!targetUid) {
    return { ...realSession, impersonating: false, realIsAdmin: true };
  }

  const targetDoc = await readUserDocument(targetUid);
  if (!targetDoc) {
    window.localStorage.removeItem(IMPERSONATE_UID_KEY);
    return { ...realSession, impersonating: false, realIsAdmin: true };
  }

  return {
    ...realSession,
    userId: targetUid,
    uid: targetUid,
    email: targetDoc.profile?.email || realSession.email,
    name: targetDoc.profile?.fullName || "Kullanıcı",
    profile: targetDoc.profile || {},
    role: targetDoc.role || { type: "member", status: "active" },
    projectAccess: targetDoc.projectAccess || {},
    impersonating: true,
    adminUserId: realSession.uid,
    adminEmail: realSession.email,
    realIsAdmin: true,
    isAdmin: false 
  };
}

export async function login(email, password) {
  // Login denemesi öncesi ban kontrolü
  if (checkSecurityBan()) return null;

  try {
    await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    return { ok: true };
  } catch {
    return { ok: false, message: "E-posta veya şifre hatalı." };
  }
}

export async function logout() {
  window.localStorage.removeItem(IMPERSONATE_UID_KEY);
  try {
    await signOut(auth);
  } finally {
    window.location.replace("/");
  }
}

/**
 * requireAuth: Sayfa koruma ve oturum doğrulama ana fonksiyonu
 */
export async function requireAuth({ allowedRoles = [] } = {}) {
  // 1. ADIM: Donanımsal/Yazılımsal Yasak Kontrolü
  if (checkSecurityBan()) return null;

  const user = await waitForAuthUser();

  // 2. ADIM: Oturum yoksa login'e yönlendir
  if (!user) {
    window.location.href = getLoginPath();
    return null;
  }

  const real = await buildRealSession(user);
  const effective = await getEffectiveSession(real);

  // 3. ADIM: Kullanıcı statüsü kontrolü
  if (effective.role.status !== "active" && !effective.realIsAdmin) {
    alert("Hesabınız aktif değil. Lütfen destek ile iletişime geçin.");
    await logout();
    return null;
  }

  // 4. ADIM: Rol bazlı erişim kontrolü
  if (allowedRoles.length > 0 && !allowedRoles.includes(effective.role.type)) {
    window.location.href = getDashboardPath(effective.role.type);
    return null;
  }

  return effective;
}
