import { getSession, getPaths, logout } from './auth.js';
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

function makeLink(href, label, active) {
  const cls = active ? 'nav-link is-active' : 'nav-link';
  return `<li class="nav-item"><a class="${cls}" href="${href}">${label}</a></li>`;
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
    if (user.role === 'admin') {
      links.push(makeLink(paths.admin, 'Admin', currentPath === '/dashboard/admin.html'));
    }
  } else {
    links.push(makeLink(paths.login, 'Login', currentPath === '/pages/login.html'));
  }

  container.innerHTML = `
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
}
