// js/pages/member.js
import { db } from "../lib/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/**
 * UI: Metin güncelleme
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
        setTimeout(() => { 
            overlay.style.display = "none"; 
            overlay.remove(); // DOM'dan tamamen kaldır ki tıklamaları engellemesin
        }, 800);
    }
}

/**
 * Kullanıcıya özel verileri Firestore'dan çeker
 */
async function loadDashboardData(sess) {
    try {
        const effectiveUid = sess.effectiveUid || sess.uid;

        // 1. İsimleri Yaz
        setText("user-name-title", sess.name || "Kullanıcı");
        setText("user-name-display", sess.name || "Kullanıcı");
        const avatar = document.getElementById("user-avatar");
        if(avatar && sess.name) avatar.textContent = sess.name.charAt(0).toUpperCase();

        // 2. Firestore'dan Kullanıcı Detaylarını Çek
        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            
            // Proje Yetkileri
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
        hideLoadingOverlay();
    }
}

/**
 * Ana Başlatıcı
 */
function init() {
    console.log("[member.js] Session kontrolü başlatılıyor...");
    
    let attempts = 0;
    const maxAttempts = 50; // 5 saniye boyunca dene

    const checkSession = setInterval(async () => {
        attempts++;
        
        // window.USER_SESSION merkezi auth.js tarafından doldurulur
        if (window.USER_SESSION) {
            clearInterval(checkSession);
            console.log("[member.js] Oturum bulundu, veriler yükleniyor...");
            await loadDashboardData(window.USER_SESSION);
        } 
        
        if (attempts >= maxAttempts) {
            clearInterval(checkSession);
            console.warn("[member.js] Oturum zaman aşımı! Overlay zorla kapatılıyor.");
            hideLoadingOverlay(); // Eğer oturum gelmezse kullanıcıyı sonsuza kadar bekletme
        }
    }, 100);
}

// Sayfa yüklendiğinde başlat
init();
