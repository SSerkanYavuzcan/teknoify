/**
 * dashboard/shared/sidebar.js (MODÜLER V9 UYUMLU)
 * Tüm sistemin sol menüsünü (Sidebar) Firestore'dan okuyarak dinamik çizen motor.
 */

// db nesnesini doğrudan merkezi kütüphanemizden çağırıyoruz
import { db } from "/js/lib/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
   path = path.replace(/\/\//g, '/'); // Çift slash önleme
   
   // Eğer admin Impersonation modundaysa URL'ye otomatik ekle!
   const impUid = localStorage.getItem("teknoify_impersonate_uid");
   if (impUid && path !== "#") {
       path += (path.includes('?') ? '&' : '?') + 'imp_uid=' + impUid;
   }
   
   return path;
}

async function initSidebar() {
  const sess = window.USER_SESSION;
  if (!sess) return;

  const userProjectIds = Array.isArray(sess.projectIds) ? sess.projectIds : Object.keys(sess.projectAccess || {}).filter(k => sess.projectAccess[k] === true);
  const isAdmin = sess.isAdmin || sess.realIsAdmin; // Adminse her şeyi görsün
  
  const container = document.getElementById("tk-sidebar-projects") || document.getElementById("dynamic-services-menu");
  const exploreContainer = document.getElementById("explore-services-menu");

  if (!container) return;

  try {
    // V9 Modüler Firestore çekimi
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

    // Adminse tüm aktif projeleri owned saysın, değilse projelere yetkisi var mı diye baksın
    const owned = allProjects.filter(p => isAdmin || userProjectIds.includes(p.id));
    const locked = allProjects.filter(p => !isAdmin && !userProjectIds.includes(p.id));

    // ---------------------------------------------
    // YETKİLİ OLUNAN PROJELER (KİLİTSİZ)
    // ---------------------------------------------
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

    // ---------------------------------------------
    // YETKİSİZ OLUNAN PROJELER (KİLİTLİ / KEŞFET)
    // ---------------------------------------------
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
    console.error("Sidebar dinamik render hatası:", e);
  }
}

// Global fonksiyona bağla ki member.js çağırabilsin
window.TK_RENDER_SIDEBAR = initSidebar;
