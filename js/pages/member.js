// js/pages/member.js
import { logout as logoutFn, requireAuth } from "../lib/auth.js";
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
        // session.isAdmin, yeni auth yapına göre daha güvenilir bir kontrol
        const effectiveUserId = (session.isAdmin && impUid) ? impUid : session.uid;

        // 3. Kullanıcı Bilgilerini Bas
        const displayName = session.name || session.displayName || (session.email ? session.email.split("@")[0] : "Değerli Kullanıcımız");
        setText("user-name-display", displayName);
        setText("user-name-title", displayName);
        setText("user-avatar", displayName.charAt(0).toUpperCase());

        // 4. Kullanıcının Kendi Dokümanını ve Yetkilerini Çek
        const userSnap = await getDoc(doc(db, "users", effectiveUserId));
        let entitledIds = [];
        
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            
            // GÜNCEL SİSTEM: Yetkiler projectAccess içinden okunuyor
            const projectAccess = userDoc.projectAccess || {};
            entitledIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
            
            // UI Güncellemeleri
            setText("stat-active-services", entitledIds.length); // Aktif hizmet sayısı doğru yazılacak!
            
            const statsData = userDoc.data || {};
            setText("stat-saved-hours", statsData.savedHours || "0");
            setText("stat-next-payment", statsData.nextPayment || "Belirlenmedi");
            setText("processed-data-count", statsData.totalProcessed || "0");

            renderNotifications(statsData.notifications || []);
        }

        // 5. Dinamik Menüyü (Sidebar) Çizdirmek için window.USER_SESSION objesini güncelle ve Sidebar'ı tetikle
        // Bu sayede proje sayfalarındaki (shared/auth.js) menü ile %100 aynı menüye sahip olacaksın.
        window.USER_SESSION = {
            ...session,
            projectIds: entitledIds
        };

        if (typeof window.TK_RENDER_SIDEBAR === "function") {
            window.TK_RENDER_SIDEBAR();
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
