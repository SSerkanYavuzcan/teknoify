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
    root.style.display = "contents";
    const isGeneralActive = currentPath().includes('member.html') || currentPath().includes('admin.html');
    const investmentHref = "/dashboard/services/investment/index.html";

    root.innerHTML = `
        <style>
            .sidebar { width: 270px !important; }
            .main-content { margin-left: 270px !important; }
            body.sidebar-closed .sidebar { width: 80px !important; }
            body.sidebar-closed .main-content { margin-left: 80px !important; }
            .menu-item.locked:hover { background: rgba(255, 255, 255, 0.05); color: #fff !important; }
            #tk-logout-modal {
                display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.75); z-index: 99999; align-items: center; justify-content: center; backdrop-filter: blur(8px);
            }
            .tk-modal-wrapper {
                position: relative; padding: 2px; border-radius: 20px; overflow: hidden; 
                width: 90%; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            }
            .tk-modal-wrapper::before {
                content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                background: conic-gradient(from 0deg, transparent 70%, #6366f1 85%, #a855f7 100%);
                animation: tk-spin 3s linear infinite; z-index: 0;
            }
            .tk-modal-inner {
                position: relative; z-index: 1; background: #11131a; border-radius: 18px; 
                padding: 40px 30px; text-align: center; display: flex; flex-direction: column; gap: 20px;
            }
            @keyframes tk-spin { 100% { transform: rotate(360deg); } }
            .tk-modal-btn-cancel {
                padding: 12px 30px; background: transparent; border: 1px solid #3f3f46; color: #e4e4e7; 
                border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1.05rem; transition: 0.2s;
            }
            .tk-modal-btn-logout {
                padding: 12px 30px; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; color: white; 
                border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1.05rem; transition: 0.2s; 
                display: flex; align-items: center; justify-content: center; gap: 8px;
            }
        </style>

        <div id="tk-logout-modal">
            <div class="tk-modal-wrapper">
                <div class="tk-modal-inner">
                    <h3 style="margin: 0; font-size: 1.7rem; font-weight: 700; color: #ffffff;">Çıkış Yap</h3>
                    <p style="margin: 0; color: #a1a1aa; font-size: 1.1rem;">Hesabınızdan çıkış yapmak istediğinize emin misiniz?</p>
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
                
                <div class="tk-nav-section tk-static-services-header" style="margin-top:20px;margin-bottom:10px;padding-left:16px;font-size:0.75rem;color:#71717a;font-weight:700;text-transform:uppercase;"><span>Hizmetler</span></div>
                <a href="${investmentHref}" class="menu-item ${isActiveLink(investmentHref) ? 'active' : ''}" data-static-service="investment" title="Yatırım" aria-label="Yatırım">
                    <i class="fas fa-chart-line"></i> <span>Yatırım</span>
                </a>

                <div class="tk-nav-section" id="tk-sidebar-agents-header" style="display: none; margin-top:20px;margin-bottom:10px;padding-left:16px;font-size:0.75rem;color:#71717a;font-weight:700;text-transform:uppercase;"><span>Ajanlar</span></div>
                <div id="tk-sidebar-agents"></div>

                <div class="tk-nav-section" id="tk-sidebar-services-header" style="display: none; margin-top:20px;margin-bottom:10px;padding-left:16px;font-size:0.75rem;color:#71717a;font-weight:700;text-transform:uppercase;"><span>Projelerim</span></div>
                <div id="tk-sidebar-projects"></div>
                
                <div class="tk-nav-section" id="tk-explore-header" style="display: none; margin-top:20px;margin-bottom:10px;padding-left:16px;font-size:0.75rem;color:#71717a;font-weight:700;text-transform:uppercase;"><span>Keşfet</span></div>
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

  const containerProjects = document.getElementById("tk-sidebar-projects");
  const containerAgents = document.getElementById("tk-sidebar-agents"); // Yeni Ajanlar Konteyneri
  const exploreContainer = document.getElementById("explore-services-menu");
  if (!containerProjects) return;

  try {
    const userDocRef = doc(db, "users", sess.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    let projectAccess = {};
    let agentAccess = {}; // Yeni Ajan Erişim Listesi
    let discoverAccess = {};
    let isAdmin = sess.isAdmin || false;

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        projectAccess = userData.projectAccess || {};
        agentAccess = userData.agentAccess || {}; // Kullanıcının ajan yetkilerini çekiyoruz
        discoverAccess = userData.discoverAccess || {};
        isAdmin = isAdmin || userData.isAdmin || false;
    }

    const userProjectIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
    const userAgentIds = Object.keys(agentAccess).filter(k => agentAccess[k] === true); // Sahip olunan ajanlar
    const userDiscoverIds = Object.keys(discoverAccess).filter(k => discoverAccess[k] === true);

    const allProjects = [];
    const allAgents = []; // Tüm ajanları tutacağımız dizi

    if (isAdmin) {
        // ADMIN: Tüm Projeleri Çek
        const projectSnapshot = await getDocs(collection(db, "projects"));
        projectSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.config?.isActive !== false) allProjects.push({ id: doc.id, ...data });
        });

        // ADMIN: Tüm Ajanları Çek
        const agentSnapshot = await getDocs(collection(db, "agents"));
        agentSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.config?.isActive !== false) allAgents.push({ id: doc.id, ...data });
        });

    } else {
        // NORMAL KULLANICI: Sadece İzinli Projeleri Çek
        const targetProjectIds = [...new Set([...userProjectIds, ...userDiscoverIds])];
        const projectPromises = targetProjectIds.map(id => getDoc(doc(db, "projects", id)));
        const projectSnaps = await Promise.all(projectPromises);
        projectSnaps.forEach(snap => {
            if(snap.exists()){
                const data = snap.data();
                if(data.config?.isActive !== false) allProjects.push({ id: snap.id, ...data });
            }
        });

        // NORMAL KULLANICI: Sadece İzinli Ajanları Çek (Keşfet mantığı ajanlara da uygulanabilir)
        const targetAgentIds = [...new Set([...userAgentIds])]; // Şimdilik sadece sahip oldukları ajanları görsün
        const agentPromises = targetAgentIds.map(id => getDoc(doc(db, "agents", id)));
        const agentSnaps = await Promise.all(agentPromises);
        agentSnaps.forEach(snap => {
            if(snap.exists()){
                const data = snap.data();
                if(data.config?.isActive !== false) allAgents.push({ id: snap.id, ...data });
            }
        });
    }

    allProjects.sort((a, b) => (a.details?.name || a.id).localeCompare(b.details?.name || b.id));
    allAgents.sort((a, b) => (a.details?.name || a.id).localeCompare(b.details?.name || b.id));

    // --- 1. PROJELERİ EKRANA BASMA ---
    const ownedProjects = allProjects.filter(p => isAdmin || userProjectIds.includes(p.id));
    containerProjects.innerHTML = ownedProjects.map(p => {
        const href = resolveUrl(p.config?.folderPath, p.config?.entryPoint);
        return `
            <a href="${href}" class="menu-item ${isActiveLink(href) ? 'active' : ''}" data-project="${p.id}">
                ${iconHtml(p.details?.icon)}
                <span>${p.details?.name || p.id}</span>
            </a>`;
    }).join('');
    document.getElementById("tk-sidebar-services-header").style.display = ownedProjects.length ? "block" : "none";

    // --- 2. AJANLARI EKRANA BASMA (YENİ) ---
    const ownedAgents = allAgents.filter(a => isAdmin || userAgentIds.includes(a.id));
    if (containerAgents) {
        containerAgents.innerHTML = ownedAgents.map(a => {
            // Ajanların link yapısı projelerden farklıysa burada revize edilebilir
            const href = resolveUrl(a.config?.folderPath, a.config?.entryPoint);
            return `
                <a href="${href}" class="menu-item ${isActiveLink(href) ? 'active' : ''}" data-agent="${a.id}">
                    ${iconHtml(a.details?.icon || 'fas fa-robot')} <span>${a.details?.name || a.id}</span>
                </a>`;
        }).join('');
        document.getElementById("tk-sidebar-agents-header").style.display = ownedAgents.length ? "block" : "none";
    }

    // --- 3. KEŞFET ALANI EKRANA BASMA ---
    if (exploreContainer) {
        const lockedProjects = allProjects.filter(p => !isAdmin && !userProjectIds.includes(p.id) && userDiscoverIds.includes(p.id));
        exploreContainer.innerHTML = lockedProjects.map(p => `
            <a href="#" class="menu-item locked" style="opacity: 0.6;" onclick="alert('${p.details?.name || p.id} için erişim izniniz bulunmuyor.'); return false;">
                ${iconHtml(p.details?.icon)}
                <span>${p.details?.name || p.id}</span>
                <i class="fas fa-lock" style="margin-left:auto; font-size:12px; color:#f59e0b;"></i>
            </a>`).join('');
        document.getElementById("tk-explore-header").style.display = lockedProjects.length ? "block" : "none";
    }

  } catch (e) {
    console.error("Sidebar yüklenirken hata:", e);
  }
}

window.TK_RENDER_SIDEBAR = initSidebar;
window.toggleSidebar = () => document.body.classList.toggle("sidebar-closed");
window.logoutApp = (e) => { if(e) e.preventDefault(); document.getElementById("tk-logout-modal").style.display = "flex"; };
window.closeLogoutModal = () => document.getElementById("tk-logout-modal").style.display = "none";
window.executeLogout = async () => {
    window.closeLogoutModal();
    const loader = document.getElementById("loading-overlay");
    if (loader) {
        loader.style.display = "flex";
        loader.style.opacity = "1";
        document.getElementById("dynamic-loader-text").textContent = "Güvenli çıkış yapılıyor...";
    }
    await logout();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectSidebarSkeleton);
} else {
    injectSidebarSkeleton();
}
