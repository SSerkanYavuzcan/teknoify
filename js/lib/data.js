import { getJSON, setJSON, STORAGE_KEYS } from './storage.js';

export function getUsers() {
  return getJSON(STORAGE_KEYS.users, []);
}

export function getProjects() {
  return getJSON(STORAGE_KEYS.projects, []);
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
