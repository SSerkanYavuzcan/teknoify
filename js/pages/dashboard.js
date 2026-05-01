import { logout, requireAuth } from "../lib/auth.js";
import { db } from "../lib/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { createEl, qs } from "../utils/dom.js";

const DEFAULT_PROJECT_URLS = {
  web_scraping: "/dashboard/web-scraping/quickcommerce/index.html",
  bim_faz_2: "/dashboard/bim-istekleri/index.html"
};

function appendImpersonationContext(path) {
  const impUid = localStorage.getItem("teknoify_impersonate_uid");
  if (!impUid) return path;

  const [base, hash = ""] = String(path || "").split("#");
  const [pathname, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  params.set("imp_uid", impUid);
  const qsStr = params.toString();
  return `${pathname}${qsStr ? `?${qsStr}` : ""}${hash ? `#${hash}` : ""}`;
}

function resolveProjectUrl(path, projectId = "") {
  const fallback = DEFAULT_PROJECT_URLS[projectId] || "#";
  const finalPath = path || fallback;
  if (!finalPath) return "#";
  if (/^(https?:)?\/\//.test(finalPath)) return finalPath;
  return appendImpersonationContext(finalPath);
}

function redirectIfSingleProject(projects) {
  if (!Array.isArray(projects) || projects.length !== 1) return false;
  const target = resolveProjectUrl(projects[0].url, projects[0].id);
  if (!target || target === "#") return false;
  window.location.replace(target);
  return true;
}

function renderProjects(projects) {
  const list = qs("#project-list");
  const empty = qs("#project-empty");
  if (!list || !empty) return;

  list.innerHTML = "";

  if (!projects.length) {
    empty.style.display = "block";
    list.style.display = "none";
    return;
  }

  empty.style.display = "none";
  list.style.display = "grid";

  projects.forEach((project) => {
    const card = createEl("article", { 
      className: "service-card", 
      style: "display: flex; flex-direction: column; background: #111; padding: 25px; border-radius: 12px; border: 1px solid #333; transition: transform 0.3s;" 
    });
    
    const title = createEl("h3", { 
      text: project.name, 
      style: "margin-bottom: 10px; font-size: 1.25rem;" 
    });
    
    const description = createEl("p", { 
      text: project.description || "Bu hizmet için panel erişimi.", 
      style: "color: #9ca3af; font-size: 0.9rem; line-height: 1.5; margin-bottom: 25px; flex-grow: 1;" 
    });
    
    const actions = createEl("div", { className: "card-ctas" });

    const actionLink = createEl("a", {
      className: "btn btn-sm btn-primary",
      text: "Keşfet",
      style: "text-align: center; display: block; text-decoration: none; border-radius: 8px;"
    });

    actionLink.href = resolveProjectUrl(project.url, project.id);

    actions.append(actionLink);
    card.append(title, description, actions);
    list.append(card);
  });
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  const userName = qs("#session-user-name");
  if (userName) userName.textContent = session.name;

  const adminLink = qs("#admin-link");
  if (adminLink) adminLink.style.display = session.isAdmin || session.role?.type === "admin" ? "block" : "none";

  const logoutButton = qs("#logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      logoutButton.textContent = "Çıkış Yapılıyor...";
      logoutButton.disabled = true;
      await logout();
    });
  }

  const list = qs("#project-list");
  if (list) list.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; color: #9ca3af;'>Projeleriniz yükleniyor...</p>";

  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const activeProjects = [];

    querySnapshot.forEach((doc) => {
      const projectId = doc.id;
      const projectData = doc.data();

      if (projectData.config?.isActive === false) return;

      const hasAccess = session.isAdmin || (session.projectAccess && session.projectAccess[projectId] === true);

      if (hasAccess) {
        const folderPath = projectData.config?.folderPath || `../dashboard/${projectId}`;
        const entryPoint = projectData.config?.entryPoint || "index.html";
        
        activeProjects.push({
          id: projectId,
          name: projectData.details?.name || projectId,
          description: projectData.details?.description || "",
          url: `${folderPath}/${entryPoint}`
        });
      }
    });

    if (redirectIfSingleProject(activeProjects)) return;
    renderProjects(activeProjects);

  } catch (error) {
    if (list) list.innerHTML = "<p style='grid-column: 1 / -1; color: #ef4444; text-align: center;'>Projeler yüklenirken bir hata oluştu.</p>";
  }
}

init();
