// js/pages/dashboard.js
import { logout, requireAuth } from "../lib/auth.js";
import { getProjects, getUserEntitledProjectIds } from "../lib/data.js";
import { createEl, qs } from "../utils/dom.js";

/**
 * Admin impersonation varsa hedef UID'yi bul.
 * NOT: Buradaki key isimleri farklı olabilir diye birkaç olası anahtar okuyoruz.
 * Admin.js hangi key ile set ediyorsa onu yakalar.
 */
function getImpersonatedUidFromStorage() {
  return (
    localStorage.getItem("teknoify_impersonate_uid") ||
    localStorage.getItem("tk_impersonate_uid") ||
    localStorage.getItem("impersonate_uid") ||
    localStorage.getItem("impersonateUid") ||
    sessionStorage.getItem("teknoify_impersonate_uid") ||
    sessionStorage.getItem("tk_impersonate_uid") ||
    sessionStorage.getItem("impersonate_uid") ||
    sessionStorage.getItem("impersonateUid") ||
    null
  );
}

function getEffectiveUserId(session) {
  const imp = getImpersonatedUidFromStorage();
  // Sadece admin ise impersonate’i dikkate al
  if (session?.isAdmin && imp && typeof imp === "string") return imp;
  return session.userId;
}

function resolveProjectUrl(path) {
  if (!path) return "#";
  if (/^(https?:)?\/\//.test(path)) return path; // absolute URL
  if (path.startsWith("/")) return path;         // site root
  // dashboard içindeyiz, "pages/xyz.html" direkt doğru çalışır
  return path;
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
      text: "Keşfet"
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

  const effectiveUserId = getEffectiveUserId(session);

  // Header name: istersen burada "impersonated" etiketi de gösterebilirsin
  const userName = qs("#session-user-name");
  if (userName) userName.textContent = session.name || "Kullanıcı";

  // Kritik fix: entitlements'ı effective UID ile çek
  const entitledIds = await getUserEntitledProjectIds(effectiveUserId);

  const allProjects = await getProjects();
  const activeProjects = allProjects.filter(
    (p) => p.status === "active" && entitledIds.includes(p.id)
  );

  renderProjects(activeProjects);

  const logoutButton = qs("#logout-btn");
  if (logoutButton) logoutButton.addEventListener("click", logout);

  // Admin linki admin’de kalsın (impersonate olsa bile)
  const adminLink = qs("#admin-link");
  if (adminLink) adminLink.hidden = !session.isAdmin;
}

init();
