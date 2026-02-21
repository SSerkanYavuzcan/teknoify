// js/lib/auth.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const IMPERSONATE_UID_KEY = "teknoify_impersonate_uid";
const IMPERSONATE_NAME_KEY = "teknoify_impersonate_name";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Path helpers (mevcut yaklaşımı koruyoruz)
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

async function isAdminUid(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

async function ensureUserProfile(user) {
  const uid = user.uid;
  const email = normalizeEmail(user.email);
  const defaultName = email ? email.split("@")[0] : "User";

  await setDoc(
    doc(db, "users", uid),
    {
      email,
      name: user.displayName || defaultName,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function buildRealSession(user) {
  await ensureUserProfile(user);

  const uid = user.uid;
  const email = normalizeEmail(user.email);

  const admin = await isAdminUid(uid);

  // Profil name'i okumak için:
  const profileSnap = await getDoc(doc(db, "users", uid));
  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const name = profile?.name || (email ? email.split("@")[0] : "User");

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
 * Impersonation (opsiyonel ama altyapısı “gerçek admin” şartıyla güvenli)
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

  // Hedef admin mi kontrol
  const targetIsAdmin = await isAdminUid(targetUid);
  if (targetIsAdmin) return { ok: false, message: "Admin hesapları impersonate edilemez." };

  window.localStorage.setItem(IMPERSONATE_UID_KEY, targetUid);
  window.localStorage.removeItem(IMPERSONATE_NAME_KEY);
  if (to) window.location.href = to;
  return { ok: true, targetUid };
}

async function getEffectiveSession(realSession) {
  if (!realSession.isAdmin) {
    return { ...realSession, impersonating: false, realIsAdmin: realSession.isAdmin };
  }

  const targetUid = window.localStorage.getItem(IMPERSONATE_UID_KEY);
  if (!targetUid) {
    return { ...realSession, impersonating: false, realIsAdmin: realSession.isAdmin };
  }

  // target profil bilgisi
  const targetProfileSnap = await getDoc(doc(db, "users", targetUid));
  if (!targetProfileSnap.exists()) {
    window.localStorage.removeItem(IMPERSONATE_UID_KEY);
    window.localStorage.removeItem(IMPERSONATE_NAME_KEY);
    return { ...realSession, impersonating: false, realIsAdmin: realSession.isAdmin };
  }

  // target admin değilse override et
  const targetIsAdmin = await isAdminUid(targetUid);
  if (targetIsAdmin) {
    window.localStorage.removeItem(IMPERSONATE_UID_KEY);
    window.localStorage.removeItem(IMPERSONATE_NAME_KEY);
    return { ...realSession, impersonating: false, realIsAdmin: realSession.isAdmin };
  }

  const targetProfile = targetProfileSnap.data();
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
    const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    // Profil oluştur/güncelle
    await ensureUserProfile(cred.user);
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
    window.location.href = getLoginPath();
  }
}

/**
 * requireAuth:
 * - default: effective session döner (admin impersonate varsa user gibi)
 * - { role:'admin' }: gerçek admin şart
 */
export async function requireAuth({ role } = {}) {
  const user = await waitForAuthUser();

  if (!user) {
    window.location.href = getLoginPath();
    return null;
  }

  const real = await buildRealSession(user);

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
