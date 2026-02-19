// js/pages/admin.js
import { logout, requireAuth } from "../lib/auth.js";
import {
  getAllEntitlements,
  getAdminUids,
  getProjects,
  getUsers,
  setEntitlementsBulk
} from "../lib/data.js";
import { createEl, qs } from "../utils/dom.js";

function buildEntitlementMap(entitlements) {
  const map = new Map();
  entitlements.forEach((item) => {
    map.set(item.userId, new Set(item.projectIds));
  });
  return map;
}

function renderAccessMatrix(users, projects, entitlementMap) {
  const container = qs("#entitlement-table-wrapper");
  if (!container) return;

  container.innerHTML = "";

  const table = createEl("table", { className: "feature-table" });
  const thead = createEl("thead");
  const headRow = createEl("tr");

  headRow.append(createEl("th", { text: "User" }));
  projects.forEach((project) => headRow.append(createEl("th", { text: project.name })));
  thead.append(headRow);

  const tbody = createEl("tbody");

  users.forEach((user) => {
    const row = createEl("tr");
    row.append(createEl("td", { text: `${user.name || "User"} (${user.email || "-"})` }));

    const entitledProjectIds = entitlementMap.get(user.id) || new Set();
    projects.forEach((project) => {
      const cell = createEl("td");
      const input = createEl("input");
      input.type = "checkbox";
      input.checked = entitledProjectIds.has(project.id);
      input.dataset.userId = user.id;
      input.dataset.projectId = project.id;
      input.className = "toggle-access";
      input.setAttribute("aria-label", `${user.email} - ${project.name} erişimi`);
      cell.append(input);
      row.append(cell);
    });

    tbody.append(row);
  });

  table.append(thead, tbody);
  container.append(table);
}

function collectEntitlements() {
  const checkboxes = Array.from(document.querySelectorAll(".toggle-access"));
  const map = new Map();

  checkboxes.forEach((input) => {
    const { userId, projectId } = input.dataset;
    if (!map.has(userId)) map.set(userId, []);
    if (input.checked) map.get(userId).push(projectId);
  });

  return Array.from(map.entries()).map(([userId, projectIds]) => ({ userId, projectIds }));
}

async function init() {
  const session = await requireAuth({ role: "admin" });
  if (!session) return;

  const [usersAll, adminUids, projectsAll, entitlementsAll] = await Promise.all([
    getUsers(),
    getAdminUids(),
    getProjects(),
    getAllEntitlements()
  ]);

  const users = usersAll.filter((u) => !adminUids.includes(u.id)); // admin’leri matrix’ten çıkar
  const projects = projectsAll.filter((p) => p.status === "active");
  const entitlementMap = buildEntitlementMap(entitlementsAll);

  renderAccessMatrix(users, projects, entitlementMap);

  const saveButton = qs("#save-entitlements");
  const feedback = qs("#save-feedback");
  if (saveButton && feedback) {
    saveButton.addEventListener("click", async () => {
      await setEntitlementsBulk(collectEntitlements());
      feedback.hidden = false;
      window.setTimeout(() => (feedback.hidden = true), 2000);
    });
  }

  const logoutButton = qs("#logout-btn");
  if (logoutButton) logoutButton.addEventListener("click", logout);
}

init();
