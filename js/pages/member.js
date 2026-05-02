// js/pages/member.js
import { db } from "../lib/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/**
 * Kullanıcıya özel verileri Firestore'dan çeker ve ekrana basar
 */
async function loadDashboardData(sess) {
    try {
        const effectiveUid = sess.effectiveUid || sess.uid;

        // 1. Profil Bilgilerini Garanti Altına Al
        const name = sess.name || sess.displayName || "Kullanıcı";
        const titleEl = document.getElementById("user-name-title");
        const displayEl = document.getElementById("user-name-display");
        const avatarEl = document.getElementById("user-avatar");

        if (titleEl) titleEl.textContent = name;
        if (displayEl) displayEl.textContent = name;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

        // 2. Firestore'dan Verileri Oku
        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            
            // Proje Yetkileri (Aktif Hizmet Sayısı)
            const projectAccess = userDoc.projectAccess || {};
            const entitledIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
            const activeServicesEl = document.getElementById("stat-active-services");
            if (activeServicesEl) activeServicesEl.textContent = entitledIds.length; 

            // İstatistik Kartları
            const statsData = userDoc.data || {};
            const savedHoursEl = document.getElementById("stat-saved-hours");
            const nextPaymentEl = document.getElementById("stat-next-payment");
            const processedCountEl = document.getElementById("processed-data-count");

            if (savedHoursEl) savedHoursEl.textContent = statsData.savedHours || "0";
            if (nextPaymentEl) nextPaymentEl.textContent = statsData.nextPayment || "Belirlenmedi";
            if (processedCountEl) processedCountEl.textContent = statsData.totalProcessed || "0";
        }
    } catch (err) {
        console.error("[member.js] Veri yükleme hatası:", err);
    } finally {
        // Her durumda yükleme ekranını kapat
        const overlay = document.getElementById("loading-overlay");
        if (overlay) {
            overlay.style.opacity = "0";
            setTimeout(() => { overlay.remove(); }, 800);
        }
    }
}

/**
 * Merkezi auth.js'in USER_SESSION'ı oluşturmasını bekler
 */
function init() {
    let attempts = 0;
    const checkSession = setInterval(() => {
        attempts++;
        if (window.USER_SESSION) {
            clearInterval(checkSession);
            loadDashboardData(window.USER_SESSION);
        }
        // 5 saniye içinde oturum gelmezse sonsuz yüklenmeyi engelle
        if (attempts > 50) {
            clearInterval(checkSession);
            const overlay = document.getElementById("loading-overlay");
            if (overlay) overlay.remove();
        }
    }, 100);
}

// Başlat
init();
