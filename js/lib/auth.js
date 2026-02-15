import { getUsers } from './data.js';
import { getJSON, setJSON } from './storage.js';

const SESSION_KEY = 'teknoify_session';
const IMPERSONATE_KEY = 'impersonated_user_key';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Path helpers
 * (Login sayfası /pages içinde olduğunda doğru relative path üretilsin)
 */
function getLoginPath() {
  const p = window.location.pathname || '';
  if (p.includes('/dashboard/')) return '../pages/login.html';
  if (p.includes('/pages/')) return 'login.html';
  return 'pages/login.html';
}

function getDashboardPath() {
  const p = window.location.pathname || '';
  if (p.includes('/dashboard/')) return 'index.html';
  if (p.includes('/pages/')) return '../dashboard/index.html';
  return 'dashboard/index.html';
}

function getAdminPath() {
  const p = window.location.pathname || '';
  if (p.includes('/dashboard/')) return 'admin.html';
  if (p.includes('/pages/')) return '../dashboard/admin.html';
  return 'dashboard/admin.html';
}

function getMemberPath() {
  const p = window.location.pathname || '';
  if (p.includes('/dashboard/')) return 'member.html';
  if (p.includes('/pages/')) return '../dashboard/member.html';
  return 'dashboard/member.html';
}

export function login(email, password) {
  const users = getUsers();
  const normalizedEmail = normalizeEmail(email);

  const matchedUser = users.find(
    (user) =>
      normalizeEmail(user.email) === normalizedEmail &&
      user.password === password
  );

  if (!matchedUser) {
    return { ok: false, message: 'E-posta veya şifre hatalı.' };
  }

  const session = {
    userId: matchedUser.id,
    email: matchedUser.email,
    role: matchedUser.role,
    issuedAt: Date.now()
  };

  setJSON(SESSION_KEY, session);

  // Admin değilse, eski impersonation kalıntısı varsa temizle
  if (session.role !== 'admin') {
    window.localStorage.removeItem(IMPERSONATE_KEY);
  }

  return { ok: true, session };
}

export function logout() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(IMPERSONATE_KEY);
  window.location.href = getLoginPath();
}

export function getSession() {
  return getJSON(SESSION_KEY, null); // gerçek session
}

/**
 * Impersonation helpers
 */
export function isImpersonating() {
  return !!window.localStorage.getItem(IMPERSONATE_KEY);
}

export function getImpersonatedEmail() {
  return normalizeEmail(window.localStorage.getItem(IMPERSONATE_KEY));
}

export function stopImpersonation({ redirect = true } = {}) {
  window.localStorage.removeItem(IMPERSONATE_KEY);
  if (redirect) window.location.href = getAdminPath();
}

/**
 * Admin-only: start impersonation by email
 * (Admin panelden "View as" ile veya impersonate sayfası ile tetiklenir.)
 */
export function startImpersonation(targetEmail, { to } = {}) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return { ok: false, message: 'Sadece admin impersonate başlatabilir.' };
  }

  const email = normalizeEmail(targetEmail);
  if (!email) return { ok: false, message: 'Hedef e-posta boş olamaz.' };

  const users = getUsers();
  const target = users.find((u) => normalizeEmail(u.email) === email);

  if (!target) {
    return { ok: false, message: 'Hedef kullanıcı bulunamadı.' };
  }

  if (target.role === 'admin') {
    return { ok: false, message: 'Admin hesapları impersonate edilemez.' };
  }

  if (normalizeEmail(session.email) === email) {
    return { ok: false, message: 'Kendi hesabını impersonate edemezsin.' };
  }

  window.localStorage.setItem(IMPERSONATE_KEY, target.email);

  if (to) window.location.href = to;
  return { ok: true, target: { id: target.id, email: target.email, role: target.role } };
}

/**
 * Effective session:
 * - admin değilse: normal session
 * - admin + impersonating: user gibi davranacak “override session”
 */
export function getEffectiveSession() {
  const session = getSession();
  if (!session) return null;

  if (session.role !== 'admin') {
    return { ...session, impersonating: false };
  }

  const impEmail = getImpersonatedEmail();
  if (!impEmail) {
    return { ...session, impersonating: false };
  }

  const users = getUsers();
  const target = users.find((u) => normalizeEmail(u.email) === impEmail);

  // Hedef yoksa/bozuk state -> temizle
  if (!target || target.role === 'admin') {
    window.localStorage.removeItem(IMPERSONATE_KEY);
    return { ...session, impersonating: false };
  }

  // EFFECTIVE OVERRIDE: userId/email/role “hedef kullanıcı”
  return {
    ...session,
    userId: target.id,
    email: target.email,
    role: target.role,
    impersonating: true,
    adminEmail: session.email,
    adminUserId: session.userId
  };
}

/**
 * requireAuth:
 * - default: effective session döner (impersonate varsa user gibi)
 * - role: 'admin' isteniyorsa gerçek session admin olmalı
 */
export function requireAuth({ role } = {}) {
  const real = getSession();

  if (!real) {
    window.location.href = getLoginPath();
    return null;
  }

  // Admin sayfaları: gerçek admin session şart
  if (role === 'admin') {
    if (real.role !== 'admin') {
      window.location.href = getDashboardPath();
      return null;
    }
    return { ...real, impersonating: false };
  }

  // diğer sayfalar: effective session (impersonate varsa user rolüyle)
  const effective = getEffectiveSession();

  if (role && effective.role !== role) {
    window.location.href = getDashboardPath();
    return null;
  }

  return effective;
}
