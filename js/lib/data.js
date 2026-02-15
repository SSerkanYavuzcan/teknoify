import { getJSON, setJSON, STORAGE_KEYS } from './storage.js';
import { makeId, slugify } from '../utils/ids.js';

const SESSION_KEY = 'teknoify_session';

export function getUsers() {
  return getJSON(STORAGE_KEYS.users, []);
}

export function setUsers(users) {
  setJSON(STORAGE_KEYS.users, users);
}

export function getProjects() {
  return getJSON(STORAGE_KEYS.projects, []);
}

export function setProjects(projects) {
  setJSON(STORAGE_KEYS.projects, projects);
}

export function getEntitlements() {
  return getJSON(STORAGE_KEYS.entitlements, []);
}

export function setEntitlements(newEntitlements) {
  setJSON(STORAGE_KEYS.entitlements, newEntitlements);
}

export function getUserEntitledProjectIds(userId) {
  const entitlements = getEntitlements();
  const userEntitlement = entitlements.find((item) => item.userId === userId);
  return userEntitlement ? userEntitlement.projectIds : [];
}

export function ensureEntitlementsRecord(userId) {
  const entitlements = getEntitlements();
  const exists = entitlements.some((item) => item.userId === userId);
  if (!exists) {
    entitlements.push({ userId, projectIds: [] });
    setEntitlements(entitlements);
  }
}

export function removeUserEntitlements(userId) {
  const next = getEntitlements().filter((item) => item.userId !== userId);
  setEntitlements(next);
}

export function removeProjectFromAllEntitlements(projectId) {
  const next = getEntitlements().map((entry) => ({
    ...entry,
    projectIds: entry.projectIds.filter((id) => id !== projectId)
  }));
  setEntitlements(next);
}

export function createUser(userInput) {
  const users = getUsers();
  const email = String(userInput.email || '').trim().toLowerCase();
  const emailExists = users.some((item) => item.email.toLowerCase() === email);

  if (emailExists) {
    return { ok: false, message: 'Bu e-posta zaten kayıtlı.' };
  }

  const user = {
    id: userInput.id || makeId('u'),
    name: String(userInput.name || '').trim(),
    email,
    role: userInput.role === 'admin' ? 'admin' : 'user',
    password: String(userInput.password || ''),
    notes: String(userInput.notes || '').trim(),
    enabled: true,
    createdAt: new Date().toISOString()
  };

  setUsers([...users, user]);
  ensureEntitlementsRecord(user.id);

  return { ok: true, user };
}

export function updateUser(userId, patch) {
  const users = getUsers();
  let hasConflict = false;

  const next = users.map((item) => {
    if (item.id !== userId) {
      return item;
    }

    if (patch.email) {
      const normalized = String(patch.email).trim().toLowerCase();
      const duplicate = users.some(
        (candidate) =>
          candidate.id !== userId && candidate.email.toLowerCase() === normalized
      );
      if (duplicate) {
        hasConflict = true;
        return item;
      }
    }

    return {
      ...item,
      ...patch,
      email: patch.email
        ? String(patch.email).trim().toLowerCase()
        : item.email,
      name: patch.name ? String(patch.name).trim() : item.name,
      notes:
        patch.notes !== undefined ? String(patch.notes).trim() : item.notes,
      password:
        patch.password !== undefined && patch.password !== ''
          ? String(patch.password)
          : item.password
    };
  });

  if (hasConflict) {
    return { ok: false, message: 'E-posta başka bir kullanıcıda mevcut.' };
  }

  setUsers(next);
  return { ok: true };
}

export function setUserEnabled(userId, enabled) {
  const users = getUsers().map((item) =>
    item.id === userId ? { ...item, enabled: Boolean(enabled) } : item
  );
  setUsers(users);
}

export function deleteUser(userId) {
  const users = getUsers().filter((item) => item.id !== userId);
  setUsers(users);
  removeUserEntitlements(userId);

  const session = getJSON(SESSION_KEY, null);
  if (session && session.userId === userId) {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export function createProject(projectInput) {
  const projects = getProjects();
  const baseId = projectInput.id || slugify(projectInput.name) || makeId('project');
  const projectId = baseId;

  const exists = projects.some((item) => item.id === projectId);
  if (exists) {
    return { ok: false, message: 'Proje ID zaten mevcut.' };
  }

  const project = {
    id: projectId,
    name: String(projectInput.name || '').trim(),
    description: String(projectInput.description || '').trim(),
    demoUrl: String(projectInput.demoUrl || '').trim(),
    status: projectInput.status === 'inactive' ? 'inactive' : 'active',
    createdAt: new Date().toISOString()
  };

  setProjects([...projects, project]);
  return { ok: true, project };
}

export function updateProject(projectId, patch) {
  const projects = getProjects();

  const next = projects.map((item) => {
    if (item.id !== projectId) {
      return item;
    }

    return {
      ...item,
      ...patch,
      name: patch.name !== undefined ? String(patch.name).trim() : item.name,
      description:
        patch.description !== undefined
          ? String(patch.description).trim()
          : item.description,
      demoUrl:
        patch.demoUrl !== undefined ? String(patch.demoUrl).trim() : item.demoUrl,
      status: patch.status || item.status
    };
  });

  setProjects(next);
}

export function setProjectStatus(projectId, status) {
  updateProject(projectId, { status: status === 'inactive' ? 'inactive' : 'active' });
}

export function deleteProject(projectId) {
  const next = getProjects().filter((item) => item.id !== projectId);
  setProjects(next);
  removeProjectFromAllEntitlements(projectId);
}
