import { auth, db } from "/js/lib/firebase.js";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const IMPERSONATE_UID_KEY = "teknoify_impersonate_uid";

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
    profile: profileData, // EKLENDİ: Dashboard'un okuyabilmesi için profile objesi eklendi
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
    profile: targetDoc.profile || {}, // EKLENDİ: Taklit edilen kullanıcının profile objesi aktarıldı
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

export async function requireAuth({ allowedRoles = [] } = {}) {
  const user = await waitForAuthUser();

  if (!user) {
    window.location.href = getLoginPath();
    return null;
  }

  const real = await buildRealSession(user);
  const effective = await getEffectiveSession(real);

  if (effective.role.status !== "active" && !effective.realIsAdmin) {
    alert("Hesabınız aktif değil. Lütfen destek ile iletişime geçin.");
    await logout();
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(effective.role.type)) {
    window.location.href = getDashboardPath(effective.role.type);
    return null;
  }

  return effective;
}
