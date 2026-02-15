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

  window.localStorage.removeItem(IMPERSONATION_KEY);
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

export function getImpersonation() {
  return getJSON(IMPERSONATION_KEY, null);
}

export function isImpersonating() {
  const state = getImpersonation();
  return Boolean(state && state.adminUserId && state.targetUserId);
}

export function getEffectiveSession() {
  return getSession();
}

export function startImpersonation(targetUserId) {
  const currentSession = getSession();
  if (!currentSession) {
    return { ok: false, message: 'Aktif oturum bulunamadı.' };
  }

  const adminUser = getUserById(currentSession.userId);
  if (!adminUser || adminUser.role !== 'admin') {
    return { ok: false, message: 'Sadece admin impersonation başlatabilir.' };
  }

  const targetUser = getUserById(targetUserId);
  if (!targetUser) {
    return { ok: false, message: 'Hedef kullanıcı bulunamadı.' };
  }

  if (targetUser.role === 'admin') {
    return { ok: false, message: 'Admin kullanıcı için impersonation gerekmez.' };
  }

  if (targetUser.enabled === false) {
    return { ok: false, message: 'Devre dışı kullanıcı impersonate edilemez.' };
  }

  const impersonationState = {
    adminUserId: adminUser.id,
    targetUserId: targetUser.id,
    startedAt: Date.now(),
    adminSessionBackup: currentSession
  };

  const targetSession = {
    userId: targetUser.id,
    email: targetUser.email,
    role: targetUser.role,
    issuedAt: Date.now()
  };

  setJSON(IMPERSONATION_KEY, impersonationState);
  setJSON(SESSION_KEY, targetSession);

  return { ok: true };
}

export function stopImpersonation() {
  const state = getImpersonation();
  if (!state) {
    return { ok: false, message: 'Aktif impersonation bulunamadı.' };
  }

  const backup = state.adminSessionBackup;
  const adminUser = getUserById(state.adminUserId);

  if (!backup || !adminUser || adminUser.enabled === false || adminUser.role !== 'admin') {
    window.localStorage.removeItem(IMPERSONATION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    return { ok: false, message: 'Admin oturumu geri yüklenemedi.' };
  }

  setJSON(SESSION_KEY, {
    ...backup,
    userId: adminUser.id,
    email: adminUser.email,
    role: 'admin'
  });
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

  const currentUser = getUserById(session.userId);

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
