/**
 * dashboard/shared/sidebar.js
 * Tüm sistemin sol menüsünü (Sidebar) dinamik olarak çizen merkezi motor.
 * Doğrudan Firestore 'projects' koleksiyonundan beslenir.
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

  // Veritabanındaki yolları gerçek URL'ye çeviren yardımcı
  function resolveUrl(folderPath, entryPoint) {
     let path = folderPath ? `/${folderPath}/${entryPoint || 'index.html'}` : "#";
     // Çift slash (//) hatalarını temizler
     return path.replace(/\/\//g, '/');
  }

  async function initSidebar() {
    if (!window.db) return;
    const sess = window.USER_SESSION;
    if (!sess) return;

    // Kullanıcının yetkili olduğu proje ID'leri
    const userProjectIds = Array.isArray(sess.projectIds) ? sess.projectIds : [];
    
    // HTML'deki menü alanlarını bul
    const container = document.getElementById("tk-sidebar-projects") || document.getElementById("dynamic-services-menu");
    const exploreContainer = document.getElementById("explore-services-menu");

    if (!container) return;

    try {
      // 1. Firestore'dan Tüm Projeleri Çek
      const snap = await window.db.collection("projects").get();
      const allProjects = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        // Sadece Ayarlardan "Aktif" (isActive: true) yapılmış projeleri al
        if (data.config && data.config.isActive === true) {
          allProjects.push({ id: doc.id, ...data });
        }
      });

      // 2. Projeleri İsimlerine Göre Alfabetik Sırala
      allProjects.sort((a, b) => {
         const nameA = a.details?.name || a.id;
         const nameB = b.details?.name || b.id;
         return String(nameA).localeCompare(String(nameB));
      });

      // 3. Projeleri Sahiplik Durumuna Göre İkiye Böl
      const owned = allProjects.filter(p => userProjectIds.includes(p.id));
      const locked = allProjects.filter(p => !userProjectIds.includes(p.id));

      // ----------------------------------------------------
      // YETKİLİ OLUNAN PROJELERİ ÇİZ (HİZMETLER)
      // ----------------------------------------------------
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

      // Eğer yetkili proje varsa "Hizmetler" başlığını göster, yoksa gizle
      const header = document.getElementById("tk-sidebar-services-header");
      if (header) header.style.display = owned.length ? "block" : "none";

      // ----------------------------------------------------
      // YETKİSİZ OLUNAN PROJELERİ ÇİZ (KEŞFET / KİLİTLİ)
      // ----------------------------------------------------
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
        
        // "Keşfet" Başlığının Görünürlüğü
        const exploreHeader = exploreContainer.previousElementSibling;
        if (exploreHeader && exploreHeader.tagName.toLowerCase() === 'div') {
           exploreHeader.style.display = locked.length ? "block" : "none";
        }
      }

    } catch (e) {
      console.error("Sidebar dinamik render hatası:", e);
    }
  }

  // Fonksiyonu dışarıya açık hale getiriyoruz ki auth.js veya member.js bunu tetikleyebilsin
  window.TK_RENDER_SIDEBAR = initSidebar;
})();
