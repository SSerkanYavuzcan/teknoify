import { logout, requireAuth } from '../lib/auth.js';
import {
  createProject,
  createUser,
  deleteProject,
  deleteUser,
  ensureEntitlementsRecord,
  getEntitlements,
  getProjects,
  getUsers,
  setEntitlements,
  setProjectStatus,
  setUserEnabled,
  updateProject,
  updateUser
} from '../lib/data.js';
import { initSeedDataOnce, STORAGE_KEYS } from '../lib/storage.js';
import { slugify } from '../utils/ids.js';
import { createEl, qs } from '../utils/dom.js';

function showMessage(node, message, isError = false) {
  if (!node) {
    return;
  }
  node.textContent = message;
  node.style.color = isError ? '#ea5455' : '#28c76f';
  node.hidden = false;
  window.setTimeout(() => {
    node.hidden = true;
  }, 2200);
}

function renderTabs() {
  const tabButtons = Array.from(document.querySelectorAll('[data-tab-target]'));
  const panes = Array.from(document.querySelectorAll('[data-tab-pane]'));

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.tabTarget;

      tabButtons.forEach((item) => item.classList.remove('is-active'));
      panes.forEach((pane) => {
        pane.hidden = pane.dataset.tabPane !== target;
      });

      button.classList.add('is-active');
    });
  });
}

function buildEntitlementMap(entitlements) {
  const map = new Map();
  entitlements.forEach((item) => {
    map.set(item.userId, new Set(item.projectIds));
  });
  return map;
}

function collectEntitlements() {
  const checkboxes = Array.from(document.querySelectorAll('.toggle-access'));
  const map = new Map();

  checkboxes.forEach((input) => {
    const { userId, projectId } = input.dataset;
    if (!map.has(userId)) {
      map.set(userId, []);
    }
    if (input.checked) {
      map.get(userId).push(projectId);
    }
  });

  return Array.from(map.entries()).map(([userId, projectIds]) => ({
    userId,
    projectIds
  }));
}

function renderUsersList(filter = '') {
  const list = qs('#users-list');
  if (!list) {
    return;
  }

  const searchText = filter.trim().toLowerCase();
  const roleFilter = String(qs('#user-role-filter')?.value || 'all');

  list.innerHTML = '';

  const users = getUsers().filter((item) => {
    const textHit =
      item.name.toLowerCase().includes(searchText) ||
      item.email.toLowerCase().includes(searchText);

    if (roleFilter === 'all') {
      return textHit;
    }

    return textHit && item.role === roleFilter;
  });

  users.forEach((user) => {
    const row = createEl('div', { className: 'service-card' });
    row.style.marginBottom = '12px';

    const title = createEl('h3', {
      text: `${user.name} (${user.role}) ${user.enabled === false ? '• disabled' : ''}`
    });
    const meta = createEl('p', {
      text: `${user.email} • ${user.createdAt || '-'}`
    });

    const actions = createEl('div', { className: 'card-ctas' });

    const editBtn = createEl('button', { className: 'btn btn-sm btn-secondary', text: 'Edit' });
    editBtn.type = 'button';
    editBtn.addEventListener('click', () => {
      const nextName = window.prompt('İsim', user.name);
      if (nextName === null) {
        return;
      }
      const nextRole = window.prompt('Rol (user/admin)', user.role);
      if (nextRole === null) {
        return;
      }
      const nextPassword = window.prompt('Yeni şifre (boş bırakılırsa değişmez)', '');
      const result = updateUser(user.id, {
        name: nextName,
        role: nextRole === 'admin' ? 'admin' : 'user',
        password: nextPassword || undefined
      });
      showMessage(qs('#users-feedback'), result.message || 'Kullanıcı güncellendi.', !result.ok);
      if (result.ok) {
        renderAll();
      }
    });

    const toggleBtn = createEl('button', {
      className: 'btn btn-sm btn-outline',
      text: user.enabled === false ? 'Enable' : 'Disable'
    });
    toggleBtn.type = 'button';
    toggleBtn.addEventListener('click', () => {
      setUserEnabled(user.id, user.enabled === false);
      renderAll();
    });

    const deleteBtn = createEl('button', {
      className: 'btn btn-sm btn-outline',
      text: 'Delete'
    });
    deleteBtn.type = 'button';
    deleteBtn.addEventListener('click', () => {
      const confirmed = window.confirm('Kullanıcı kalıcı olarak silinsin mi?');
      if (!confirmed) {
        return;
      }
      deleteUser(user.id);
      showMessage(qs('#users-feedback'), 'Kullanıcı silindi.');
      renderAll();
    });

    actions.append(editBtn, toggleBtn, deleteBtn);
    row.append(title, meta, actions);
    list.append(row);
  });
}

function renderProjectsList() {
  const list = qs('#projects-list');
  if (!list) {
    return;
  }

  list.innerHTML = '';

  getProjects().forEach((project) => {
    const row = createEl('div', { className: 'service-card' });
    row.style.marginBottom = '12px';

    const title = createEl('h3', {
      text: `${project.name} (${project.id}) • ${project.status}`
    });
    const meta = createEl('p', { text: project.description || '-' });
    const actions = createEl('div', { className: 'card-ctas' });

    const editBtn = createEl('button', { className: 'btn btn-sm btn-secondary', text: 'Edit' });
    editBtn.type = 'button';
    editBtn.addEventListener('click', () => {
      const nextName = window.prompt('Proje adı', project.name);
      if (nextName === null) {
        return;
      }
      const nextDescription = window.prompt('Açıklama', project.description || '');
      if (nextDescription === null) {
        return;
      }
      const nextDemoUrl = window.prompt('Demo URL', project.demoUrl || '');
      if (nextDemoUrl === null) {
        return;
      }
      const nextStatus = window.prompt('Status (active/inactive)', project.status);
      updateProject(project.id, {
        name: nextName,
        description: nextDescription,
        demoUrl: nextDemoUrl,
        status: nextStatus === 'inactive' ? 'inactive' : 'active'
      });
      showMessage(qs('#projects-feedback'), 'Proje güncellendi.');
      renderAll();
    });

    const archiveBtn = createEl('button', {
      className: 'btn btn-sm btn-outline',
      text: project.status === 'inactive' ? 'Activate' : 'Archive'
    });
    archiveBtn.type = 'button';
    archiveBtn.addEventListener('click', () => {
      setProjectStatus(project.id, project.status === 'inactive' ? 'active' : 'inactive');
      renderAll();
    });

    const deleteBtn = createEl('button', {
      className: 'btn btn-sm btn-outline',
      text: 'Delete'
    });
    deleteBtn.type = 'button';
    deleteBtn.addEventListener('click', () => {
      const confirmed = window.confirm('Proje kalıcı olarak silinsin mi?');
      if (!confirmed) {
        return;
      }
      deleteProject(project.id);
      showMessage(qs('#projects-feedback'), 'Proje silindi.');
      renderAll();
    });

    actions.append(editBtn, archiveBtn, deleteBtn);
    row.append(title, meta, actions);
    list.append(row);
  });
}

function renderAccessMatrix() {
  const container = qs('#entitlement-table-wrapper');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const users = getUsers().filter((user) => user.role !== 'admin');
  const projects = getProjects();
  const entitlementMap = buildEntitlementMap(getEntitlements());

  const table = createEl('table', { className: 'feature-table' });
  const thead = createEl('thead');
  const headRow = createEl('tr');

  headRow.append(createEl('th', { text: 'User' }));
  projects.forEach((project) => {
    headRow.append(createEl('th', { text: `${project.name} (${project.status})` }));
  });
  thead.append(headRow);

  const tbody = createEl('tbody');

  users.forEach((user) => {
    ensureEntitlementsRecord(user.id);
    const row = createEl('tr');
    row.append(
      createEl('td', {
        text: `${user.name} (${user.email})${user.enabled === false ? ' • disabled' : ''}`
      })
    );

    const entitledProjectIds = entitlementMap.get(user.id) || new Set();
    projects.forEach((project) => {
      const cell = createEl('td');
      const input = createEl('input');
      input.type = 'checkbox';
      input.checked = entitledProjectIds.has(project.id);
      input.dataset.userId = user.id;
      input.dataset.projectId = project.id;
      input.className = 'toggle-access';
      input.setAttribute('aria-label', `${user.name} - ${project.name} erişimi`);
      cell.append(input);
      row.append(cell);
    });

    tbody.append(row);
  });

  table.append(thead, tbody);
  container.append(table);
}

function renderAll() {
  const searchValue = String(qs('#users-search')?.value || '');
  renderUsersList(searchValue);
  renderProjectsList();
  renderAccessMatrix();
}

function wireForms() {
  const usersForm = qs('#create-user-form');
  const usersFeedback = qs('#users-feedback');
  const projectsForm = qs('#create-project-form');
  const projectsFeedback = qs('#projects-feedback');

  if (usersForm) {
    usersForm.addEventListener('submit', (event) => {
      event.preventDefault();
      usersFeedback.hidden = true;

      const formData = new FormData(usersForm);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const role = String(formData.get('role') || 'user');
      const password = String(formData.get('password') || '').trim();
      const notes = String(formData.get('notes') || '').trim();

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!name || !email || !password || !emailPattern.test(email)) {
        showMessage(usersFeedback, 'Geçerli ad, e-posta ve şifre zorunludur.', true);
        return;
      }

      const result = createUser({ name, email, role, password, notes });
      showMessage(usersFeedback, result.message || 'Kullanıcı oluşturuldu.', !result.ok);

      if (result.ok) {
        usersForm.reset();
        renderAll();
      }
    });
  }

  if (projectsForm) {
    projectsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      projectsFeedback.hidden = true;

      const formData = new FormData(projectsForm);
      const name = String(formData.get('name') || '').trim();
      const id = String(formData.get('id') || '').trim();
      const description = String(formData.get('description') || '').trim();
      const demoUrl = String(formData.get('demoUrl') || '').trim();
      const status = String(formData.get('status') || 'active');

      if (!name) {
        showMessage(projectsFeedback, 'Proje adı zorunludur.', true);
        return;
      }

      const result = createProject({
        name,
        id: id ? slugify(id) : slugify(name),
        description,
        demoUrl,
        status
      });

      showMessage(projectsFeedback, result.message || 'Proje oluşturuldu.', !result.ok);

      if (result.ok) {
        projectsForm.reset();
        renderAll();
      }
    });
  }

  const searchInput = qs('#users-search');
  const roleFilter = qs('#user-role-filter');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderUsersList(searchInput.value);
    });
  }

  if (roleFilter) {
    roleFilter.addEventListener('change', () => {
      renderUsersList(String(searchInput?.value || ''));
    });
  }

  const saveAccessBtn = qs('#save-entitlements');
  const accessFeedback = qs('#save-feedback');

  if (saveAccessBtn && accessFeedback) {
    saveAccessBtn.addEventListener('click', () => {
      setEntitlements(collectEntitlements());
      showMessage(accessFeedback, 'Erişimler kaydedildi.');
      renderAccessMatrix();
    });
  }

  const resetBtn = qs('#reset-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmed = window.confirm('Tüm MVP verileri sıfırlansın mı?');
      if (!confirmed) {
        return;
      }

      Object.values(STORAGE_KEYS).forEach((key) => {
        window.localStorage.removeItem(key);
      });
      window.localStorage.removeItem('teknoify_session');
      window.location.reload();
    });
  }
}

async function init() {
  await initSeedDataOnce();

  const session = requireAuth({ role: 'admin' });
  if (!session) {
    return;
  }

  renderTabs();
  wireForms();
  renderAll();

  const logoutButton = qs('#logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }
}

init();
