// js/pages/dashboard.js
import { logout, requireAuth } from "../lib/auth.js";
import { getProjects, getUserEntitledProjectIds } from "../lib/data.js";
import { createEl, qs } from "../utils/dom.js";

function resolveProjectUrl(path) {
  if (/^(https?:)?\/\//.test(path)) return path;
  if (path.startsWith("../")) return path;
  return `../${path}`;
}

// ---- IMPERSONATE HELPERS (localStorage) ----
function getImpersonation() {
  const uid = localStorage.getItem("impersonate_uid");
  if (!uid) return null;
  return {
    uid,
    email: localStorage.getItem("impersonate_email") || "",
    name: localStorage.getItem("impersonate_name") || ""
  };
}

function getEffectiveUserId(sessionUserId) {
  const imp = getImpersonation();
  return imp?.uid || sessionUserId;
}

function clearImpersonation() {
  localStorage.removeItem("impersonate_uid");
  localStorage.removeItem("impersonate_email");
  localStorage.removeItem("impersonate_name");
}

function renderProjects(projects) {
  const list = qs("#project-list");
  const empty = qs("#project-empty");
  if (!list || !empty) return;

  list.innerHTML = "";

  if (!projects.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  projects.forEach((project) => {
    const card = createEl("article", { className: "service-card" });
    const title = createEl("h3", { text: project.name });
    const description = createEl("p", { text: project.description });
    const actions = createEl("div", { className: "card-ctas" });
    const actionLink = createEl("a", {
      className: "btn btn-sm btn-primary",
      text: "Demo Aç"
    });

    actionLink.href = resolveProjectUrl(project.demoUrl);
    actionLink.target = "_blank";
    actionLink.rel = "noopener noreferrer";

    actions.append(actionLink);
    card.append(title, description, actions);
    list.append(card);
  });
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  // 1) Effective UID (impersonate varsa onu kullan)
  const imp = getImpersonation();
  const effectiveUserId = getEffectiveUserId(session.userId);

  // 2) Üstte görünen isim
  const userName = qs("#session-user-name");
  if (userName) {
    if (imp) {
      const label = imp.name || imp.email || "İmpersonated User";
      userName.textContent = `${label} (Impersonate)`;
    } else {
      userName.textContent = session.name || "Kullanıcı";
    }
  }

  // 3) Projeleri effective UID ile çek
  const entitledIds = await getUserEntitledProjectIds(effectiveUserId);
  const activeProjects = (await getProjects()).filter(
    (project) => project.status === "active" && entitledIds.includes(project.id)
  );

  renderProjects(activeProjects);

  // 4) Logout: önce impersonate temizle
  const logoutButton = qs("#logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearImpersonation();
      logout();
    });
  }

  // 5) Admin linki: admin ise her zaman görünsün (impersonate olsa bile)
  const adminLink = qs("#admin-link");
  if (adminLink) adminLink.hidden = !session.isAdmin;
}

init();
