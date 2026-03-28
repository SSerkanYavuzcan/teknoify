// js/pages/member.js
import { logout as logoutFn, requireAuth } from "../lib/auth.js";
import { getUserEntitledProjectIds } from "../lib/data.js";
import { db } from "../lib/firebase.js";
import { 
    doc, 
    getDoc, 
    collection, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/**
 * GÜVENLİK: XSS Koruması için HTML Escape fonksiyonu
 */
function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * UI: Metin güncelleme yardımcı fonksiyonu
 */
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "";
}

/**
 * UI: Yükleme ekranını kapatma
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = "none";
    }, 600);
}

/**
 * DİNAMİK MENÜ RENDER SİSTEMİ
 * Projeleri Firebase'den çeker ve yetki durumuna göre uygun kategoriye basar.
 */
async function renderDynamicMenu(entitledIds) {
    const servicesContainer = document.getElementById("dynamic-services-menu");
    const exploreContainer = document.getElementById("explore-services-menu");
    
    if (!servicesContainer || !exploreContainer) return;

    servicesContainer.innerHTML = "";
    exploreContainer.innerHTML = "";

    try {
        // Tüm projeleri "projects" koleksiyonundan çekiyoruz
        const querySnapshot = await getDocs(collection(db, "projects"));
        
        querySnapshot.forEach((projectDoc) => {
            const project = projectDoc.data();
            const projectId = projectDoc.id;
            
            // Kullanıcının bu projeye yetkisi var mı?
            const hasAccess = entitledIds.includes(projectId);
            
            const href = project.demoUrl || project.href || "#";
            const icon = project.icon || "fas fa-cube";
            const name = project.name || projectId;

            const menuItem = document.createElement("a");
            
            if (hasAccess) {
                // DURUM 1: YETKİLİ (Hizmetler Bölümü)
                menuItem.href = href;
                menuItem.className = "menu-item";
                menuItem.innerHTML = `
                    <i class="${icon}"></i> 
                    <span>${escapeHTML(name)}</span>
                `;
                servicesContainer.appendChild(menuItem);
            } else {
                // DURUM 2: YETKİSİZ (Keşfet / Kilitli Bölümü)
                menuItem.href = "#";
                menuItem.className = "menu-item locked";
                menuItem.title = "Erişim için iletişime geçin";
                
                // Tıklandığında uyarı ver
                menuItem.onclick = (e) => {
                    e.preventDefault();
                    if (window.openContactModal) {
                        window.openContactModal(`${name} hizmetine erişmek için lütfen bizimle iletişime geçin.`);
                    } else {
                        alert(`${name} modülü şu an sizin için kilitli.`);
                    }
                };

                menuItem.innerHTML = `
                    <i class="${icon}"></i> 
                    <span>${escapeHTML(name)}</span>
                    <i class="fas fa-lock" style="font-size:10px; margin-left:auto; opacity:0.4;"></i>
                `;
                exploreContainer.appendChild(menuItem);
            }
        });
    } catch (err) {
        console.error("Projeler listelenirken hata oluştu:", err);
    }
}

/**
 * BİLDİRİM SİSTEMİ RENDER
 */
function renderNotifications(list) {
    const tbody = document.getElementById("notification-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="padding:1.5rem; text-align:center; color:#475569;">Henüz bir bildirim bulunmuyor.</td></tr>';
        return;
    }

    list.forEach((msg) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
        tr.innerHTML = `
            <td style="padding: 1rem; color: #cbd5e1;">${escapeHTML(msg)}</td>
            <td style="padding: 1rem;"><span style="color: #6366f1;"><i class="fas fa-circle" style="font-size:8px;"></i> Yeni</span></td>
            <td style="padding: 1rem; color: #475569; font-size:11px;">Şimdi</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * DASHBOARD ANA BAŞLATICI (INIT)
 */
async function init() {
    try {
        // 1. Oturum Kontrolü
        const session = await requireAuth();
        if (!session) return;

        // 2. Impersonation (Admin ise başka kullanıcı gibi görme) Kontrolü
        const impUid = localStorage.getItem("teknoify_impersonate_uid");
        const effectiveUserId = (session.role === "admin" && impUid) ? impUid : session.uid;

        // 3. Kullanıcı Bilgilerini Bas
        const displayName = session.displayName || (session.email ? session.email.split("@")[0] : "Değerli Kullanıcımız");
        setText("user-name-display", displayName);
        setText("user-name-title", displayName);
        setText("user-avatar", displayName.charAt(0).toUpperCase());

        // 4. Yetkili Projeleri Çek ve Menüyü Oluştur
        const entitledIds = await getUserEntitledProjectIds(effectiveUserId);
        setText("stat-active-services", entitledIds.length);
        
        // Menü Render fonksiyonunu çağırıyoruz
        await renderDynamicMenu(entitledIds);

        // 5. Ekstra Kullanıcı Verilerini Firestore'dan Çek
        const userSnap = await getDoc(doc(db, "users", effectiveUserId));
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            const data = userDoc.data || {};
            
            setText("stat-saved-hours", data.savedHours || "0");
            setText("stat-next-payment", data.nextPayment || "Belirlenmedi");
            setText("processed-data-count", data.totalProcessed || "0");

            renderNotifications(data.notifications || []);
        }

    } catch (err) {
        console.error("Dashboard yüklenirken kritik hata:", err);
    } finally {
        // Her durumda yükleme ekranını kapat
        hideLoadingOverlay();
    }
}

// Global Fonksiyonları window'a bağla (HTML'den erişim için)
window.logout = async () => { if (confirm("Çıkış yapmak istediğinize emin misiniz?")) await logoutFn(); };
window.toggleSidebar = () => { document.body.classList.toggle("sidebar-closed"); };
window.markAllAsRead = () => { 
    const tbody = document.getElementById("notification-body");
    if(tbody) tbody.style.opacity = "0.5";
    alert("Tüm bildirimler okundu olarak işaretlendi."); 
};

// Start!
init();
