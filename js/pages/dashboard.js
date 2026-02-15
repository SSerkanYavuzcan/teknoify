import { getSession, logout, requireAuth } from '../lib/auth.js';
import { getProjects, getUserEntitledProjectIds, getUsers } from '../lib/data.js';
import { initSeedDataOnce } from '../lib/storage.js';
import { createEl, qs } from '../utils/dom.js';
import { initCommonPage } from './common.js';

function resolveProjectUrl(path) {
  if (/^(https?:)?\/\//.test(path)) {
    return path;
  }

  if (path.startsWith('../')) {
    return path;
  }

  return `../${path}`;
}

function renderProjects(projects) {
  const list = qs('#project-list');
  const empty = qs('#project-empty');

  if (!list || !empty) {
    return;
  }

  list.innerHTML = '';

  if (!projects.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  projects.forEach((project) => {
    const card = createEl('article', { className: 'service-card' });
    const title = createEl('h3', { text: project.name });
    const description = createEl('p', { text: project.description });
    const actions = createEl('div', { className: 'card-ctas' });
    const actionLink = createEl('a', {
      className: 'btn btn-sm btn-primary',
      text: 'Demo Aç'
    });

    actionLink.href = project.demoUrl ? resolveProjectUrl(project.demoUrl) : '#';
    if (project.demoUrl) {
      actionLink.target = '_blank';
      actionLink.rel = 'noopener noreferrer';
    }

    actions.append(actionLink);
    card.append(title, description, actions);
    list.append(card);
  });
}

async function init() {
  await initSeedDataOnce();

  const session = requireAuth({ returnTo: '/dashboard/index.html' });
  if (!session) {
    return;
  }

  initCommonPage({ activePath: '/dashboard/index.html' });

  const sessionFromStorage = getSession();
  const users = getUsers();
  const currentUser = users.find((item) => item.id === sessionFromStorage.userId);

  const userName = qs('#session-user-name');
  if (currentUser && userName) {
    userName.textContent = currentUser.name;
  }

  const entitledIds = getUserEntitledProjectIds(session.userId);
  const activeProjects = getProjects().filter(
    (project) => project.status === 'active' && entitledIds.includes(project.id)
  );

  renderProjects(activeProjects);

  const logoutButton = qs('#logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }
}

init();
