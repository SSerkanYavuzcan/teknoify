import { db } from "/js/lib/firebase.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

    // İçeriğin CSS wrapper'dan etkilenmemesi için serbest bırakıyoruz
    root.style.display = "contents";

    const isGeneralActive = currentPath().includes('member.html') || currentPath().includes('admin.html');

    root.innerHTML = `
        <style>
            /* Paneli Biraz Genişletiyoruz */
            .sidebar { width: 270px !important; }
            .main-content { margin-left: 270px !important; }
            body.sidebar-closed .sidebar { width: 80px !important; }
            body.sidebar-closed .main-content { margin-left: 80px !important; }
            
            /* Kilitli Menü Hover Efekti */
            .menu-item.locked:hover { background: rgba(255, 255, 255, 0.05); color: #fff !important; }

            /* ========================================= */
            /* YENİ MODAL TASARIMI VE IŞIN ANİMASYONU    */
            /* ========================================= */
            #tk-logout-modal {
                display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.75); z-index: 99999; align-items: center; justify-content: center; backdrop-filter: blur(8px);
            }
            .tk-modal-wrapper {
                position: relative; padding: 2px; border-radius: 20px; overflow: hidden; 
                width: 90%; max-width: 480px; /* Modal büyütüldü */
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            }
            /* Dönen Işın (Conic Gradient) */
            .tk-modal-wrapper::before {
                content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                background: conic-gradient(from 0deg, transparent 70%, #6366f1 85%, #a855f7 100%);
                animation: tk-spin 3s linear infinite; z-index: 0;
            }
            /* Modalın Siyah İç Gövdesi */
            .tk-modal-inner {
                position: relative; z-index: 1; background: #11131a; border-radius: 18px; 
                padding: 40px 30px; text-align: center; display: flex; flex-direction: column; gap: 20px;
            }
            @keyframes tk-spin { 100% { transform: rotate(360deg); } }
            
            /* Buton Tasarımları */
            .tk-modal-btn-cancel {
                padding: 12px 30px; background: transparent; border: 1px solid #3f3f46; color: #e4e4e7; 
                border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1.05rem; transition: 0.2s;
            }
            .tk-modal-btn-cancel:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: #52525b; }
            
            .tk-modal-btn-logout {
                padding: 12px 30px; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; color: white; 
                border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1.05rem; transition: 0.2s; 
                display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
            }
            .tk-modal-btn-logout:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5); }
        </style>

        <div id="tk-logout-modal">
            <div class="tk-modal-wrapper">
                <div class="tk-modal-inner">
                    <h3 style="margin: 0; font-size: 1.7rem; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Çıkış Yap</h3>
                    <p style="margin: 0; color: #a1a1aa; font-size: 1.1rem; line-height: 1.5;">Hesabınızdan çıkış yapmak istediğinize emin misiniz?</p>
                    <div style="display: flex; justify-content: center; gap: 16px; margin-top: 10px;">
                        <button onclick="window.closeLogoutModal()" class="tk-modal-btn-cancel">İptal</button>
                        <button onclick="window.executeLogout()" class="tk-modal-btn-logout"><i class="fas fa-power-off"></i> Çıkış Yap</button>
                    </div>
                </div>
            </div>
        </div>

        <button id="floating-toggle-btn" onclick="window.toggleSidebar()"><i class="fas fa-bars"></i></button>

        <aside class="sidebar">
            <div class="brand"><i class="fas fa-cube"></i> <span>Teknoify</span></div>
            <nav id="tk-main-nav-container">
                <a href="/dashboard/member.html" class="menu-item ${isGeneralActive ? 'active' : ''}"><i class="fas fa-home"></i> <span>Genel Bakış</span></a>
                
                <div class="tk-nav-section" id="tk-sidebar-services-header" style="display: none; margin-top:20px;margin-bottom:10px;padding-left:16px;font-size:0.75rem;color:#71717a;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;"><span>Projelerim</span></div>
                <div id="tk-sidebar-projects"></div>
                
                <div class="tk-nav-section" id="tk-explore-header" style="display: none; margin-top:20px;margin-bottom:10px;padding-left:16px;font-size:0.75rem;color:#71717a;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;"><span>Keşfet</span></div>
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

  const container = document.getElementById("tk-sidebar-projects");
  const exploreContainer = document.getElementById("explore-services-menu");

  if (!container) return;

  try {
    // 1. Kullanıcının Firestore belgesini çekip güncel yetkilerini okuyalım
    const userDocRef = doc(db, "users", sess.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    let projectAccess = {};
    let discoverAccess = {};
    let isAdmin = sess.isAdmin || false;

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        projectAccess = userData.projectAccess || {};
        discoverAccess = userData.discoverAccess || {};
        isAdmin = isAdmin || userData.isAdmin || false;
    }

    const userProjectIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
    const userDiscoverIds = Object.keys(discoverAccess).filter(k => discoverAccess[k] === true);

    // 2. Projeleri çek
    const querySnapshot = await getDocs(collection(db, "projects"));
    const allProjects = [];
    
    querySnapshot.forEach(document => {
      const data = document.data();
      if (data.config && data.config.isActive === true) {
        allProjects.push({ id: document.id, ...data });
      }
    });

    // İsimlere göre alfabetik sırala
    allProjects.sort((a, b) => {
       const nameA = a.details?.name || a.id;
       const nameB = b.details?.name || b.id;
       return String(nameA).localeCompare(String(nameB));
    });

    // 3. Mantık: Sahip olunanlar "Projelerim"e, sahip olunmayan AMA keşfet izni olanlar "Keşfet"e
    const owned = allProjects.filter(p => isAdmin || userProjectIds.includes(p.id));
    const locked = allProjects.filter(p => !isAdmin && !userProjectIds.includes(p.id) && userDiscoverIds.includes(p.id));

    // 4. "Projelerim" Render
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

    // 5. "Keşfet" Render
    if (exploreContainer) {
      let lockedHtml = "";
      locked.forEach(p => {
        const icon = p.details?.icon || "fas fa-cube";
        const name = p.details?.name || p.id;
        
        lockedHtml += `
          <a href="#" class="menu-item locked" style="opacity: 0.6; color: #a1a1aa;" title="Erişim için iletişime geçin" onclick="alert('${name} modülü şu an sizin için kilitli. İncelemek isterseniz destek ekibimize yazabilirsiniz.'); return false;">
            ${iconHtml(icon)}
            <span>${name}</span>
            <i class="fas fa-lock" style="margin-left:auto; font-size:12px; color:#f59e0b;"></i>
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
    console.error("Sidebar yüklenirken hata:", e);
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
