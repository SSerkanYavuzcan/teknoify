import { logout, requireAuth } from "../lib/auth.js";
import { db } from "../lib/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { createEl, qs } from "../utils/dom.js";

function resolveProjectUrl(path, projectId = "") {
  if (!path) return "#";
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const impUid = localStorage.getItem("teknoify_impersonate_uid");
  if (!impUid) return normalizedPath;
  return `${normalizedPath}${normalizedPath.includes('?') ? '&' : '?'}imp_uid=${impUid}`;
}

function updateSupportStatus() {
  const statusEl = qs("#dashboard-stats .stat-box:nth-child(3) .stat-value");
  if (!statusEl) return;

  const now = new Date();
  const hours = now.getHours();
  
  if (hours >= 9 && hours < 18) {
    statusEl.textContent = "Aktif";
    statusEl.style.color = "#22c55e";
  } else {
    statusEl.textContent = "Pasif";
    statusEl.style.color = "#ef4444";
  }
}

function renderAdvancedProjects(projects) {
  const list = qs("#project-list");
  const empty = qs("#project-empty");
  if (!list || !empty) return;

  list.innerHTML = "";

  if (!projects.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  projects.forEach((project) => {
    const card = createEl("div", { className: "adv-project-card" });
    
    // Kart İçeriği (HTML Şablonu)
    card.innerHTML = `
      <div class="adv-project-img-wrapper">
        <i class="${project.icon || 'fa-solid fa-earth-americas'}"></i>
      </div>
      <div class="adv-project-content">
        <div class="adv-project-header">
          <h3>${project.name}</h3>
          <div class="adv-status-badge">Aktif</div>
        </div>
        <p class="adv-project-desc">${project.description}</p>
        <div class="adv-tags">
          <span class="adv-tag purple">Analytics</span>
          <span class="adv-tag blue">Geo Data</span>
          <span class="adv-tag teal">Dashboard</span>
        </div>
        <div class="adv-project-footer">
          <div class="adv-date"><i class="fa-solid fa-calendar-day"></i> Son güncelleme: ${project.lastUpdate || 'Bugün'}</div>
          <div class="adv-actions">
            <a href="${project.url}" class="btn-glow"><i class="fa-solid fa-play"></i> Projeyi Başlat</a>
            <button class="btn-outline-dark">Detaylar <i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
      </div>
    `;
    list.append(card);
  });
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  if (qs("#session-user-name")) qs("#session-user-name").textContent = session.name;
  if (qs("#admin-link")) qs("#admin-link").style.display = (session.isAdmin || session.role?.type === "admin") ? "block" : "none";
  if (qs("#logout-btn")) qs("#logout-btn").addEventListener("click", logout);

  // Destek Durumu Kontrolü
  updateSupportStatus();
  setInterval(updateSupportStatus, 60000); // Dakikada bir kontrol et

  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const activeProjects = [];
    let latestGlobalUpdate = null;

    querySnapshot.forEach((doc) => {
      const projectId = doc.id;
      const projectData = doc.data();

      if (projectData.config?.isActive === false) return;

      const hasAccess = session.isAdmin || (session.projectAccess && session.projectAccess[projectId] === true);

      if (hasAccess) {
        const folderPath = projectData.config?.folderPath || `dashboard/${projectId}`;
        const entryPoint = projectData.config?.entryPoint || "index.html";
        const projectUpdate = projectData.audit?.lastUpdate || "Bugün";

        activeProjects.push({
          id: projectId,
          name: projectData.details?.name || projectId,
          description: projectData.details?.description || "",
          icon: projectData.details?.icon,
          url: resolveProjectUrl(`${folderPath}/${entryPoint}`, projectId),
          lastUpdate: projectUpdate
        });

        latestGlobalUpdate = projectUpdate;
      }
    });

    // İstatistikleri Güncelle
    if (qs("#stat-active-projects")) qs("#stat-active-projects").textContent = activeProjects.length;
    if (qs("#stat-tools")) qs("#stat-tools").textContent = activeProjects.length;
    if (latestGlobalUpdate && qs("#dashboard-stats .stat-box:last-child .stat-value")) {
        qs("#dashboard-stats .stat-box:last-child .stat-value").textContent = latestGlobalUpdate;
    }

    renderAdvancedProjects(activeProjects);

  } catch (error) {
    console.error("Dashboard hatası:", error);
  }
}

init();
