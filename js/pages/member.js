// /js/pages/member.js
import { db } from "/js/lib/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { requireAuth } from "/js/lib/auth.js"; // logout silindi, çünkü artık sidebar.js yönetiyor!

/**
 * UI: Metin ve Değer Güncelleme
 */
function updateUI(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "0";
}

/**
 * DASHBOARD VERİ YÜKLEYİCİ
 */
async function loadDashboardData(sess) {
    try {
        console.log("[member.js] Veri senkronizasyonu başlatıldı:", sess.uid);
        const effectiveUid = sess.userId || sess.uid;

        // 1. Profil Bilgilerini Bas
        const name = sess.name || "Kullanıcı";
        updateUI("user-name-title", name);
        updateUI("user-name-display", name);
        const avatar = document.getElementById("user-avatar");
        if(avatar) avatar.textContent = name.charAt(0).toUpperCase();

        // 2. Firestore'dan Kullanıcı Dokümanını Oku
        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            const userData = userDoc.data || {};

            // --- FİNANS VERİLERİ ---
            if (userData.finance) {
                updateUI("portfolio-value", "₺" + (userData.finance.portfolio || "385.240"));
                updateUI("monthly-savings", "₺" + (userData.finance.savings || "12.430"));
            }

            // --- SAĞLIK VERİLERİ ---
            if (userData.health) {
                updateUI("user-weight", userData.health.weight || "74.8");
                updateUI("sleep-duration", userData.health.sleep || "7s 24dk");
            }
            
            // Eğer sidebar.js yüklüyse menüyü tetikle
            if (typeof window.TK_RENDER_SIDEBAR === "function") {
                window.TK_RENDER_SIDEBAR();
            }
        }
    } catch (err) {
        console.error("[member.js] Kritik Hata:", err);
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

async function init() {
    try {
        const session = await requireAuth();

        if (session) {
            // Sidebar'ın yetkileri okuyabilmesi için oturumu globale kaydet
            window.USER_SESSION = session; 
            
            // Oturum varsa dashboard verilerini yükle
            await loadDashboardData(session);
        }
    } catch (err) {
        console.error("[member.js] Başlatma Hatası:", err);
        const loaderText = document.getElementById("dynamic-loader-text");
        if (loaderText) loaderText.textContent = "Bir hata oluştu, lütfen sayfayı yenileyin.";
    } finally {
        // Her şey bittiğinde yükleme ekranını KALDIR
        hideOverlay();
    }
}

// Sistemi Başlat
init();
