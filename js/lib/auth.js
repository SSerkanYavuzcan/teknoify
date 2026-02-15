import { getUsers } from './data.js';
import { getJSON, setJSON } from './storage.js';

const SESSION_KEY = 'teknoify_session';

function getLoginPath() {
  return window.location.pathname.includes('/dashboard/')
    ? '../pages/login.html'
    : 'pages/login.html';
}

function getDashboardPath() {
  return window.location.pathname.includes('/dashboard/')
    ? 'index.html'
    : '../dashboard/index.html';
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
  window.location.href = getLoginPath();
}

export function getSession() {
  return getJSON(SESSION_KEY, null);
}

export function requireAuth({ role } = {}) {
  const session = getSession();

  if (!session) {
    window.location.href = getLoginPath();
    return null;
  }

  if (role && session.role !== role) {
    window.location.href = getDashboardPath();
    return null;
  }

  return session;
}
