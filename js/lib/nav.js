import {
  getImpersonation,
  getPaths,
  getSession,
  isImpersonating,
  logout,
  stopImpersonation
} from './auth.js';
import { getUsers } from './data.js';

function getActiveLogicalPath() {
  const pathname = window.location.pathname;
  if (pathname.includes('/dashboard/admin.html')) return '/dashboard/admin.html';
  if (pathname.includes('/dashboard/index.html')) return '/dashboard/index.html';
  if (pathname.includes('/pages/login.html')) return '/pages/login.html';
  if (pathname.includes('/index.html')) return '/index.html';
  if (pathname.endsWith('/')) return '/index.html';
  return pathname;
}

function ensureImpersonationStyle() {
  if (document.getElementById('impersonation-banner-style')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'impersonation-banner-style';
  style.textContent = `
    .impersonation-banner{position:sticky;top:0;z-index:1300;display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(234,84,85,.18);border-bottom:1px solid rgba(234,84,85,.45)}
    .impersonation-banner__text{font-weight:600;color:#fff}
    .impersonation-banner__admin{margin-left:auto;color:#ffd0d0;font-size:.8rem}
    @media (max-width:900px){.impersonation-banner{flex-wrap:wrap}.impersonation-banner__admin{width:100%;margin-left:0}}
  `;
  document.head.append(style);
}

function makeLink(href, label, active) {
  const cls = active ? 'nav-link is-active' : 'nav-link';
  return `<li class="nav-item"><a class="${cls}" href="${href}">${label}</a></li>`;
}

function renderImpersonationBanner(users) {
  if (!isImpersonating()) {
    return '';
  }

  ensureImpersonationStyle();

  const state = getImpersonation();
  const target = users.find((item) => item.id === state.targetUserId);
  const admin = users.find((item) => item.id === state.adminSession?.userId);

  return `
    <div class="impersonation-banner" id="impersonation-banner">
      <span class="impersonation-banner__text">Viewing as: ${target ? target.email : 'user'}</span>
      <button type="button" class="btn btn-sm btn-primary" id="return-admin-btn">Return to Admin</button>
      <span class="impersonation-banner__admin">Admin: ${admin ? admin.email : '-'}</span>
    </div>
  `;
}

export function renderNav({ containerId = 'site-header', activePath } = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const session = getSession();
  const users = getUsers();
  const paths = getPaths();
  const currentPath = activePath || getActiveLogicalPath();

  const user = session
    ? users.find((item) => item.id === session.userId && item.enabled !== false)
    : null;

  const links = [makeLink(paths.home, 'Home', currentPath === '/index.html')];

  if (user) {
    links.push(
      makeLink(paths.dashboard, 'Dashboard', currentPath === '/dashboard/index.html')
    );
    if (user.role === 'admin' && !isImpersonating()) {
      links.push(makeLink(paths.admin, 'Admin', currentPath === '/dashboard/admin.html'));
    }
  } else {
    links.push(makeLink(paths.login, 'Login', currentPath === '/pages/login.html'));
  }

  container.innerHTML = `
    ${renderImpersonationBanner(users)}
    <nav class="navbar site-nav-shell">
      <div class="nav-container">
        <div class="logo">
          <a href="${paths.home}" aria-label="Ana Sayfa">
            <span class="logo-icon">T</span>
            <span class="logo-text">Teknoify</span>
          </a>
        </div>
        <ul class="nav-menu site-nav-menu" style="display:flex">${links.join('')}</ul>
        <div class="site-nav-user">
          ${
            user
              ? `<span class="site-user-indicator">Signed in as ${user.name}</span>
                 <button type="button" class="btn btn-sm btn-outline" id="global-logout-btn">Logout</button>`
              : ''
          }
        </div>
      </div>
    </nav>
  `;

  const logoutButton = document.getElementById('global-logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  const returnAdminButton = document.getElementById('return-admin-btn');
  if (returnAdminButton) {
    returnAdminButton.addEventListener('click', () => {
      const result = stopImpersonation();
      if (!result.ok) {
        window.location.href = paths.login;
        return;
      }
      window.location.href = paths.admin;
    });
  }
}
