import { db } from "/js/lib/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { logout } from "/js/lib/auth.js";

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

function resolveUrl(folderPath, entryPoint) {
   let path = folderPath ? `/${folderPath}/${entryPoint || 'index.html'}` : "#";
   path = path.replace(/\/\//g, '/');
   
   const impUid = localStorage.getItem("teknoify_impersonate_uid");
   if (impUid && path !== "#") {
       path += (path.includes('?') ? '&' : '?') + 'imp_uid=' + impUid;
   }
   
   return path;
}

function injectSidebarSkeleton() {
    const root = document.getElementById("tk-global-sidebar-root");
    if (!root || root.hasAttribute("data-injected")) return;

    const isGeneralActive = currentPath().includes('member.html') || currentPath().includes('admin.html');

    root.innerHTML = `
        <div id="tk-logout-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 99999; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
            <div style="background: #18181b; padding: 30px; border-radius: 12px; text-align: center; border: 1px solid #3f3f46; color: white; width: 90%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; font-size: 1.5rem;">Çıkış Yap</h3>
                <p style="color: #a1a1aa; margin-bottom: 24px;">Hesabınızdan çıkış yapmak istediğinize emin misiniz?</p>
                <div style="display: flex; justify-content: center; gap: 12px;">
                    <button onclick="window.closeLogoutModal()" style="padding: 10px 20px; background: transparent; border: 1px solid #3f3f46; color: white; border-radius: 6px; cursor: pointer; font-weight: bold;">İptal</button>
                    <button onclick="window.executeLogout()" style="padding: 10px 20px; background: #ef4444; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: bold;"><i class="fas fa-power-off"></i> Çıkış Yap</button>
                </div>
            </div>
        </div>

        <button id="floating-toggle-btn" onclick="window.toggleSidebar()"><i class="fas fa-bars"></i></button>

        <aside class="sidebar">
            <div class="brand"><i class="fas fa-cube"></i> <span>Teknoify</span></div>
            <nav id="tk-main-nav-container">
                <a href="/dashboard/member.html" class="menu-item ${isGeneralActive ? 'active' : ''}"><i class="fas fa-home"></i> <span>Genel Bakış</span></a>
                
                <div class="tk-nav-section" id="tk-sidebar-services-header" style="display: none; margin-top:10px;margin-bottom:5px;padding-left:16px;font-size:0.75rem;color:#666;font-weight:700;text-transform:uppercase;"><span>Projelerim</span></div>
                <div id="tk-sidebar-projects"></div>
                
                <div class="tk-nav-section" id="tk-explore-header" style="display: none; margin-top:10px;margin-bottom:5px;padding-left:16px;font-size:0.75rem;color:#666;font-weight:700;text-transform:uppercase;"><span>Keşfet</span></div>
                <div id="explore-services-menu"></div>
            </nav>
            <div class="menu-spacer"></div>
            <div class="sidebar-footer">
                <a href="#" onclick="window.logoutApp(event)" class="btn-logout"><i class="fas fa-sign-out-alt"></i> <span>Çıkış</span></a>
                <button class="btn-collapse" onclick="window.toggleSidebar()"><i class="fas fa-chevron-left"></i></button>
            </div>
        </aside>
    `;
    
    root.setAttribute("data-injected", "true");
}

async function initSidebar() {
  const sess = window.USER_SESSION;
  if (!sess) return;

  const userProjectIds = Array.isArray(sess.projectIds) ? sess.projectIds : Object.keys(sess.projectAccess || {}).filter(k => sess.projectAccess[k] === true);
  const isAdmin = sess.isAdmin || sess.realIsAdmin; 
  
  const container = document.getElementById("tk-sidebar-projects") || document.getElementById("dynamic-services-menu");
  const exploreContainer = document.getElementById("explore-services-menu");

  if (!container) return;

  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const allProjects = [];
    
    querySnapshot.forEach(doc => {
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

    const owned = allProjects.filter(p => isAdmin || userProjectIds.includes(p.id));
    const locked = allProjects.filter(p => !isAdmin && !userProjectIds.includes(p.id));

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
      
      const exploreHeader = document.getElementById("tk-explore-header");
      if (exploreHeader) {
         exploreHeader.style.display = locked.length ? "block" : "none";
      }
    }

  } catch (e) {
    console.error(e);
  }
}

window.TK_RENDER_SIDEBAR = initSidebar;

window.toggleSidebar = function() { 
    document.body.classList.toggle("sidebar-closed"); 
};

window.logoutApp = function(e) { 
    if(e) e.preventDefault(); 
    const modal = document.getElementById("tk-logout-modal");
    if(modal) modal.style.display = "flex";
};

window.closeLogoutModal = function() {
    const modal = document.getElementById("tk-logout-modal");
    if(modal) modal.style.display = "none";
};

window.executeLogout = async function() {
    window.closeLogoutModal();
    const loader = document.getElementById("loading-overlay");
    if (loader) {
        loader.style.display = "flex";
        loader.style.opacity = "1";
        const text = document.getElementById("dynamic-loader-text");
        if(text) text.textContent = "Güvenli çıkış yapılıyor...";
    }
    await logout(); 
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectSidebarSkeleton);
} else {
    injectSidebarSkeleton();
}
