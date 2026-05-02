// /js/pages/member.js

// 1. DÜZELTME: Mutlak yol kullanılarak firebase.js çağrıldı
import { db } from "/js/lib/firebase.js"; 
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/**
 * UI: Metin ve Değer Güncelleme
 */
function updateUI(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "0";
}

/**
 * DASHBOARD VERİ YÜKLEYİCİ
 * Firestore'dan kullanıcıya özel finans, sağlık ve proje verilerini çeker.
 */
async function loadDashboardData(sess) {
    try {
        console.log("[member.js] Veri senkronizasyonu başlatıldı:", sess.uid);
        const effectiveUid = sess.effectiveUid || sess.uid;

        // 1. Profil Bilgilerini Bas
        const name = sess.name || sess.displayName || "Kullanıcı";
        updateUI("user-name-title", name);
        updateUI("user-name-display", name);
        const avatar = document.getElementById("user-avatar");
        if(avatar) avatar.textContent = name.charAt(0).toUpperCase();

        // 2. Firestore'dan Kullanıcı Dokümanını Oku
        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            const userData = userDoc.data || {}; // Finans, sağlık vb. istatistiklerin olduğu obje

            // --- FİNANS VERİLERİ (Örnek eşleştirme) ---
            if (userData.finance) {
                updateUI("portfolio-value", "₺" + (userData.finance.portfolio || "385.240"));
                updateUI("monthly-savings", "₺" + (userData.finance.savings || "12.430"));
            }

            // --- SAĞLIK VERİLERİ ---
            if (userData.health) {
                updateUI("user-weight", userData.health.weight || "74.8");
                updateUI("sleep-duration", userData.health.sleep || "7s 24dk");
            }

            // --- PROJE YETKİLERİ ---
            const projectAccess = userDoc.projectAccess || {};
            const entitledIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
            
            // Eğer sidebar.js yüklüyse menüyü tetikle
            if (typeof window.TK_RENDER_SIDEBAR === "function") {
                window.TK_RENDER_SIDEBAR();
            }
        }

    } catch (err) {
        console.error("[member.js] Kritik Hata:", err);
    } finally {
        // Her durumda yükleme ekranını kapat
        hideOverlay();
    }
}

/**
 * UI: Overlay'i akıcı şekilde kaldır
 */
function hideOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.style.display = "none";
            overlay.remove(); 
        }, 800);
    }
}

/**
 * INITIALIZE (BAŞLATICI)
 * Merkezi auth.js'in USER_SESSION değişkenini doldurmasını bekler.
 */
function init() {
    let attempts = 0;
    const maxAttempts = 50; // 10 saniye limit

    const checkSession = setInterval(() => {
        attempts++;

        if (window.USER_SESSION) {
            clearInterval(checkSession);
            loadDashboardData(window.USER_SESSION);
        }

        if (attempts >= maxAttempts) {
            clearInterval(checkSession);
            console.warn("[member.js] Oturum zaman aşımına uğradı.");
            const loaderText = document.getElementById("dynamic-loader-text");
            if (loaderText) loaderText.textContent = "Oturum verisi alınamadı, lütfen sayfayı yenileyin.";
            
            // Kullanıcıyı çok bekletmemek için overlay'i 10sn sonra zorla kapatabiliriz
            // hideOverlay(); 
        }
    }, 200);
}

// Global Fonksiyonları window'a bağla
window.toggleSidebar = () => document.body.classList.toggle("sidebar-closed");
window.logoutApp = (e) => { 
    if(e) e.preventDefault(); 
    if(window.logout) window.logout(); 
};

// Start
init();
