// js/pages/member.js
import { db } from "../lib/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
    if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => { overlay.style.display = "none"; }, 600);
    }
}

/**
 * DASHBOARD ANA BAŞLATICI (INIT)
 */
async function init() {
    // Merkezi auth.js'in oturumu doldurmasını bekleyelim (Polling yöntemi)
    const checkSession = setInterval(async () => {
        if (window.USER_SESSION) {
            clearInterval(checkSession);
            await loadDashboardData();
        }
    }, 100);
}

/**
 * Kullanıcıya özel verileri Firestore'dan çeker
 */
async function loadDashboardData() {
    try {
        const sess = window.USER_SESSION;
        const effectiveUid = sess.effectiveUid || sess.uid;

        // 1. İsimleri Yaz (Hoşgeldin mesajı ve profil)
        setText("user-name-title", sess.name);
        setText("user-name-display", sess.name);
        const avatar = document.getElementById("user-avatar");
        if(avatar) avatar.textContent = sess.name.charAt(0).toUpperCase();

        // 2. Firestore'dan Kullanıcı Detaylarını Çek
        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            
            // Aktif Projeler (Yeni Yapı: projectAccess objesindeki true değerleri sayıyoruz)
            const projectAccess = userDoc.projectAccess || {};
            const entitledIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
            setText("stat-active-services", entitledIds.length); 

            // İstatistik Kartları
            const statsData = userDoc.data || {};
            setText("stat-saved-hours", statsData.savedHours || "0");
            setText("stat-next-payment", statsData.nextPayment || "Belirlenmedi");
            setText("processed-data-count", statsData.totalProcessed || "0");
        }

    } catch (err) {
        console.error("Dashboard veri yükleme hatası:", err);
    } finally {
        // Veriler yüklendikten sonra holografik yükleme ekranını kapat
        hideLoadingOverlay();
    }
}

// Global Fonksiyonları window'a bağla (HTML'den erişim için)
window.toggleSidebar = () => { document.body.classList.toggle("sidebar-closed"); };
window.markAllAsRead = () => { 
    const tbody = document.getElementById("notification-body");
    if(tbody) tbody.style.opacity = "0.5";
    alert("Tüm bildirimler okundu olarak işaretlendi."); 
};

// Start!
init();
