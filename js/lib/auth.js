// js/lib/auth.js
import { auth, db } from "./firebase.js";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const IMPERSONATE_UID_KEY = "teknoify_impersonate_uid";
const IMPERSONATE_NAME_KEY = "teknoify_impersonate_name";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Path helpers
 */
function getLoginPath() {
  const p = window.location.pathname || "";
  if (p.includes("/dashboard/")) return "../pages/login.html";
  if (p.includes("/pages/")) return "login.html";
  return "pages/login.html";
}

function getDashboardPath() {
  const p = window.location.pathname || "";
  if (p.includes("/dashboard/")) return "index.html";
  if (p.includes("/pages/")) return "../dashboard/index.html";
  return "dashboard/index.html";
}

function getAdminPath() {
  const p = window.location.pathname || "";
  if (p.includes("/dashboard/")) return "admin.html";
  if (p.includes("/pages/")) return "../dashboard/admin.html";
  return "dashboard/admin.html";
}

async function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });
}

/**
 * GÜVENLİK GÜNCELLEMESİ: Admin Tespiti
 * Artık SADECE Firebase Custom Claims'e güveniyoruz.
 * Firestore tabanlı '/admins' veya '/users' role kontrolleri (Security Raporu uyarısı gereği) kaldırıldı.
 */
async function isAdminUser(user) {
  if (!user?.uid) return false;
  try {
    const tokenResult = await getIdTokenResult(user);
    // Tek kaynak: Custom Claims içindeki admin:true değeri
    return !!(tokenResult?.claims?.admin === true);
  } catch (err) {
    console.error("Admin yetki kontrolü başarısız:", err);
    return false;
  }
}

/**
 * Profil verisi sadece görüntüleme (UI) amaçlıdır.
 * Yetkilendirme için asla kullanılmaz.
 */
async function readUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data() || null;
  } catch {
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

  // Admin kontrolü sadece Claims üzerinden yapılır
  const admin = await isAdminUser(user);

  const profile = await readUserProfile(uid);
  const name = profile?.name || computeFallbackName(user);

  return {
    userId: uid,
    uid,
    email,
    name,
    role: admin ? "admin" : "user",
    isAdmin: admin,
    issuedAt: Date.now()
  };
}

/**
 * Impersonation (Kullanıcı Taklit Etme)
 */
export function stopImpersonation({ redirect = true } = {}) {
  window.localStorage.removeItem(IMPERSONATE_UID_KEY);
  window.localStorage.removeItem(IMPERSONATE_NAME_KEY);
  if (redirect) window.location.href = getAdminPath();
}

export async function startImpersonation(targetUid, { to } = {}) {
  const user = await waitForAuthUser();
  if (!user) return { ok: false, message: "Oturum yok." };

  const real = await buildRealSession(user);
  if (!real.isAdmin) {
    return { ok: false, message: "Sadece admin impersonate başlatabilir." };
  }

  if (!targetUid) return { ok: false, message: "Hedef kullanıcı boş olamaz." };
  if (targetUid === real.uid) return { ok: false, message: "Kendi hesabını impersonate edemezsin." };

  // Hedef kullanıcının profilini oku
  const targetProfile = await readUserProfile(targetUid);
  if (!targetProfile) {
    return { ok: false, message: "Hedef kullanıcı bulunamadı." };
  }

  window.localStorage.setItem(IMPERSONATE_UID_KEY, targetUid);
  window.localStorage.removeItem(IMPERSONATE_NAME_KEY);
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

  const targetProfile = await readUserProfile(targetUid);
  if (!targetProfile) {
    window.localStorage.removeItem(IMPERSONATE_UID_KEY);
    return { ...realSession, impersonating: false, realIsAdmin: true };
  }

  return {
    ...realSession,
    userId: targetUid,
    uid: targetUid,
    email: targetProfile.email || realSession.email,
    name: targetProfile.name || realSession.name,
    role: "user",
    impersonating: true,
    adminUserId: realSession.uid,
    adminEmail: realSession.email,
    realIsAdmin: true,
    isAdmin: false
  };
}

export async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    return { ok: true };
  } catch {
    return { ok: false, message: "E-posta veya şifre hatalı." };
  }
}

export async function logout() {
  window.localStorage.removeItem(IMPERSONATE_UID_KEY);
  window.localStorage.removeItem(IMPERSONATE_NAME_KEY);
  try {
    await signOut(auth);
  } finally {
    window.location.replace(`${getLoginPath()}?loggedOut=1`);
  }
}

/**
 * requireAuth:
 * Güvenli oturum kontrolü.
 */
export async function requireAuth({ role } = {}) {
  const user = await waitForAuthUser();

  if (!user) {
    window.location.href = getLoginPath();
    return null;
  }

  const real = await buildRealSession(user);

  // Eğer sayfa sadece adminlere özelse (role === 'admin')
  if (role === "admin") {
    if (!real.isAdmin) {
      window.location.href = getDashboardPath();
      return null;
    }
    return { ...real, impersonating: false };
  }

  const effective = await getEffectiveSession(real);

  if (role && effective.role !== role) {
    window.location.href = getDashboardPath();
    return null;
  }

  return effective;
}
