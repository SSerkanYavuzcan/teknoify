// js/pages/dashboard.js
import { logout, requireAuth } from "../lib/auth.js";
import { getProjects, getUserEntitledProjectIds } from "../lib/data.js";
import { createEl, qs } from "../utils/dom.js";

function resolveProjectUrl(path) {
  if (/^(https?:)?\/\//.test(path)) return path;
  if (path.startsWith("../")) return path;
  return `../${path}`;
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

  const userName = qs("#session-user-name");
  if (userName) userName.textContent = session.name || "Kullanıcı";

  const entitledIds = await getUserEntitledProjectIds(session.userId);
  const activeProjects = (await getProjects()).filter(
    (project) => project.status === "active" && entitledIds.includes(project.id)
  );

  renderProjects(activeProjects);

  const logoutButton = qs("#logout-btn");
  if (logoutButton) logoutButton.addEventListener("click", logout);

  const adminLink = qs("#admin-link");
  if (adminLink) adminLink.hidden = !session.isAdmin; // impersonate olsa bile admin linki kalsın
}

init();
