import { getUsers } from './data.js';
import { getJSON, setJSON } from './storage.js';

const SESSION_KEY = 'teknoify_session';
const IMPERSONATION_KEY = 'teknoify_impersonation';

function inDashboard() {
  return window.location.pathname.includes('/dashboard/');
}

function inPages() {
  return window.location.pathname.includes('/pages/');
}

function getPaths() {
  if (inDashboard()) {
    return {
      home: '../index.html',
      login: '../pages/login.html',
      dashboard: 'index.html',
      admin: 'admin.html',
      unauthorized: '../pages/unauthorized.html'
    };
  }

  if (inPages()) {
    return {
      home: '../index.html',
      login: 'login.html',
      dashboard: '../dashboard/index.html',
      admin: '../dashboard/admin.html',
      unauthorized: 'unauthorized.html'
    };
  }

  return {
    home: 'index.html',
    login: 'pages/login.html',
    dashboard: 'dashboard/index.html',
    admin: 'dashboard/admin.html',
    unauthorized: 'pages/unauthorized.html'
  };
}

function getLogicalCurrentPath() {
  const pathname = window.location.pathname;

  if (pathname.includes('/dashboard/admin.html')) {
    return '/dashboard/admin.html';
  }
  if (pathname.includes('/dashboard/index.html')) {
    return '/dashboard/index.html';
  }
  if (pathname.includes('/pages/login.html')) {
    return '/pages/login.html';
  }
  if (pathname.includes('/pages/unauthorized.html')) {
    return '/pages/unauthorized.html';
  }

  return '/index.html';
}

function getUserById(userId) {
  return getUsers().find((item) => item.id === userId);
}

export function getReturnTarget() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('return');
  const paths = getPaths();

  if (!requested) {
    return paths.dashboard;
  }

  if (requested.includes('/dashboard/admin.html')) {
    return paths.admin;
  }
  if (requested.includes('/dashboard/index.html')) {
    return paths.dashboard;
  }
  if (requested.includes('/index.html')) {
    return paths.home;
  }

  return paths.dashboard;
}

export function login(email, password) {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const matchedUser = users.find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail && user.password === password
  );

  if (!matchedUser) {
    return { ok: false, message: 'E-posta veya şifre hatalı.' };
  }

  if (matchedUser.enabled === false) {
    return {
      ok: false,
      message: 'Kullanıcı devre dışı. Lütfen yönetici ile iletişime geçin.'
    };
  }

  const session = {
    userId: matchedUser.id,
    email: matchedUser.email,
    role: matchedUser.role,
    issuedAt: Date.now()
  };

  setJSON(SESSION_KEY, session);

  return { ok: true, session };
}

export function logout() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(IMPERSONATION_KEY);
  const paths = getPaths();
  window.location.href = paths.home;
}

export function getSession() {
  return getJSON(SESSION_KEY, null);
}

export function getEffectiveSession() {
  return getSession();
}

export function getImpersonation() {
  return getJSON(IMPERSONATION_KEY, null);
}

export function isImpersonating() {
  const value = getImpersonation();
  return Boolean(value && value.adminSession && value.targetUserId);
}

export function startImpersonation(targetUserId) {
  const session = getSession();
  if (!session) {
    return { ok: false, message: 'Aktif oturum bulunamadı.' };
  }

  const adminUser = getUserById(session.userId);
  if (!adminUser || adminUser.role !== 'admin') {
    return { ok: false, message: 'Sadece admin kullanıcı impersonation başlatabilir.' };
  }

  if (adminUser.id === targetUserId) {
    return { ok: false, message: 'Admin kendi hesabını impersonate edemez.' };
  }

  const targetUser = getUserById(targetUserId);
  if (!targetUser || targetUser.enabled === false) {
    return { ok: false, message: 'Hedef kullanıcı bulunamadı veya devre dışı.' };
  }

  const impersonation = {
    adminSession: session,
    targetUserId,
    startedAt: Date.now()
  };

  const targetSession = {
    userId: targetUser.id,
    email: targetUser.email,
    role: targetUser.role,
    issuedAt: Date.now()
  };

  setJSON(IMPERSONATION_KEY, impersonation);
  setJSON(SESSION_KEY, targetSession);

  return { ok: true };
}

export function stopImpersonation() {
  const impersonation = getImpersonation();
  if (!impersonation || !impersonation.adminSession) {
    return { ok: false, message: 'Aktif impersonation bulunamadı.' };
  }

  setJSON(SESSION_KEY, impersonation.adminSession);
  window.localStorage.removeItem(IMPERSONATION_KEY);

  return { ok: true };
}

export function requireAuth({ role, returnTo } = {}) {
  const session = getEffectiveSession();
  const paths = getPaths();
  const target = returnTo || getLogicalCurrentPath();

  if (!session) {
    const loginUrl = `${paths.login}?return=${encodeURIComponent(target)}`;
    window.location.href = loginUrl;
    return null;
  }

  const users = getUsers();
  const currentUser = users.find((item) => item.id === session.userId);

  if (!currentUser || currentUser.enabled === false) {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(IMPERSONATION_KEY);
    const loginUrl = `${paths.login}?return=${encodeURIComponent(target)}`;
    window.location.href = loginUrl;
    return null;
  }

  if (role === 'admin' && isImpersonating()) {
    window.location.href = paths.dashboard;
    return null;
  }

  if (role && currentUser.role !== role) {
    window.location.href = paths.unauthorized;
    return null;
  }

  return { ...session, role: currentUser.role };
}

export { getPaths, getLogicalCurrentPath, IMPERSONATION_KEY };
