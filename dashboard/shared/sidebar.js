/**
 * dashboard/shared/sidebar.js
 * Tüm sistemin sol menüsünü (Sidebar) dinamik olarak çizen merkezi motor.
 */

(function () {
  function iconHtml(icon) {
    const i = String(icon || "").trim();
    return i ? `<i class="${i}"></i>` : `<i class="fas fa-cube"></i>`;
  }

  function currentPath() {
    return (window.location.pathname || "").toLowerCase();
  }

  function toComparablePath(href) {
    const h = String(href || "").trim();
    if (!h) return "";
    try {
      if (h.startsWith("http://") || h.startsWith("https://")) {
        return new URL(h).pathname.toLowerCase();
      }
    } catch {}
    return h.toLowerCase();
  }

  function isActiveLink(href) {
    const p = currentPath();
    const h = toComparablePath(href);
    if (!h || h === "#") return false;
    
    if (h.startsWith("/")) return p === h || p.startsWith(h);
    const file = h.split("/").pop();
    return file ? p.endsWith(file) : false;
  }

  // URL oluşturucu - Impersonation destekli
  function resolveUrl(folderPath, entryPoint) {
     let path = folderPath ? `/${folderPath}/${entryPoint || 'index.html'}` : "#";
     path = path.replace(/\/\//g, '/');
     
     // Eğer admin Impersonation modundaysa URL'ye otomatik ekle!
     const impUid = localStorage.getItem("teknoify_impersonate_uid");
     if (impUid && path !== "#") {
         path += (path.includes('?') ? '&' : '?') + 'imp_uid=' + impUid;
     }
     
     return path;
  }

  async function initSidebar() {
    if (!window.db) return;
    const sess = window.USER_SESSION;
    if (!sess) return;

    const userProjectIds = Array.isArray(sess.projectIds) ? sess.projectIds : [];
    
    const container = document.getElementById("tk-sidebar-projects") || document.getElementById("dynamic-services-menu");
    const exploreContainer = document.getElementById("explore-services-menu");

    if (!container) return;

    try {
      const snap = await window.db.collection("projects").get();
      const allProjects = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        if (data.config && data.config.isActive === true) {
          allProjects.push({ id: doc.id, ...data });
        }
      });

      allProjects.sort((a, b) => {
         const nameA = a.details?.name || a.id;
         const nameB = b.details?.name || b.id;
         return String(nameA).localeCompare(String(nameB));
      });

      const owned = allProjects.filter(p => userProjectIds.includes(p.id));
      const locked = allProjects.filter(p => !userProjectIds.includes(p.id));

      // YETKİLİ OLUNAN PROJELER
      let ownedHtml = "";
      owned.forEach(p => {
        const href = resolveUrl(p.config?.folderPath, p.config?.entryPoint);
        const active = isActiveLink(href) ? "active" : "";
        const icon = p.details?.icon || "fas fa-cube";
        const name = p.details?.name || p.id;
        
        ownedHtml += `
          <a href="${href}" class="menu-item ${active}" data-project="${p.id}">
            ${iconHtml(icon)}
            <span>${name}</span>
          </a>
        `;
      });

      container.innerHTML = ownedHtml;

      const header = document.getElementById("tk-sidebar-services-header");
      if (header) header.style.display = owned.length ? "block" : "none";

      // YETKİSİZ OLUNAN PROJELER
      if (exploreContainer) {
        let lockedHtml = "";
        locked.forEach(p => {
          const icon = p.details?.icon || "fas fa-cube";
          const name = p.details?.name || p.id;
          
          lockedHtml += `
            <a href="#" class="menu-item locked" style="opacity: 0.7;" title="Erişim için iletişime geçin" onclick="alert('${name} modülü şu an sizin için kilitli.'); return false;">
              ${iconHtml(icon)}
              <span>${name}</span>
              <i class="fas fa-lock" style="margin-left:auto; font-size:10px; color:#555;"></i>
            </a>
          `;
        });
        exploreContainer.innerHTML = lockedHtml;
        
        const exploreHeader = exploreContainer.previousElementSibling;
        if (exploreHeader && exploreHeader.tagName.toLowerCase() === 'div') {
           exploreHeader.style.display = locked.length ? "block" : "none";
        }
      }

    } catch (e) {
      console.error("Sidebar dinamik render hatası:", e);
    }
  }

  window.TK_RENDER_SIDEBAR = initSidebar;
})();
