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
 * DASHBOARD VERİ YÜKLEYİCİ (GÖZ KIRPMA EFEKTİ ENGELLENDİ & DİNAMİK YUKARI KAYDIRMA EKLENDİ)
 */
async function loadDashboardData(sess) {
    try {
        console.log("[member.js] Veri senkronizasyonu başlatıldı:", sess.uid);
        const effectiveUid = sess.userId || sess.uid;

        // HTML üzerindeki 4 büyük kartı yakalıyoruz
        const cardFinance = document.getElementById("card-finance");
        const cardHealth = document.getElementById("card-health");
        const cardProductivity = document.getElementById("card-productivity");
        const cardSubscriptions = document.getElementById("card-subscriptions");
        
        // Kapsayıcı ızgara ve ana kaydırma alanını yakalıyoruz
        const personalGrid = document.getElementById("personal-cards-grid");
        const contentScroll = document.querySelector(".content-scroll");

        // 2. Firestore'dan Kullanıcı Dokümanını Oku
        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        
        let hasAnyCard = false; // Kullanıcının erişebildiği herhangi bir kart var mı?

        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            const userData = userDoc.data || {};

            // --- FİNANS VERİLERİ VE KART ERİŞİM KONTROLÜ ---
            if (userData.finance) {
                hasAnyCard = true;
                if (cardFinance) cardFinance.style.setProperty('display', 'flex', 'important'); 
                updateUI("portfolio-value", "₺" + (userData.finance.portfolio || "385.240"));
                updateUI("monthly-savings", "₺" + (userData.finance.savings || "12.430"));
            } else {
                if (cardFinance) cardFinance.style.setProperty('display', 'none', 'important'); 
            }

            // --- SAĞLIK VERİLERİ VE KART ERİŞİM KONTROLÜ ---
            if (userData.health) {
                hasAnyCard = true;
                if (cardHealth) cardHealth.style.setProperty('display', 'flex', 'important'); 
                updateUI("user-weight", userData.health.weight || "74.8");
                updateUI("sleep-duration", userData.health.sleep || "7s 24dk");
            } else {
                if (cardHealth) cardHealth.style.setProperty('display', 'none', 'important'); 
            }
            
            // --- VERİMLİLİK KARTI ERİŞİM KONTROLÜ ---
            if (userData.productivity) {
                hasAnyCard = true;
                if (cardProductivity) cardProductivity.style.setProperty('display', 'flex', 'important');
            } else {
                if (cardProductivity) cardProductivity.style.setProperty('display', 'none', 'important'); 
            }

            // --- ABONELİKLER KARTI ERİŞİM KONTROLÜ ---
            if (userData.subscriptions) {
                hasAnyCard = true;
                if (cardSubscriptions) cardSubscriptions.style.setProperty('display', 'flex', 'important');
            } else {
                if (cardSubscriptions) cardSubscriptions.style.setProperty('display', 'none', 'important'); 
            }
            
            // Eğer sidebar.js yüklüyse menüyü tetikle
            if (typeof window.TK_RENDER_SIDEBAR === "function") {
                window.TK_RENDER_SIDEBAR();
            }
        } else {
            // Kullanıcının Firestore'da hiçbir dokümanı yoksa tüm kartları gizli tut
            if (cardFinance) cardFinance.style.setProperty('display', 'none', 'important');
            if (cardHealth) cardHealth.style.setProperty('display', 'none', 'important');
            if (cardProductivity) cardProductivity.style.setProperty('display', 'none', 'important');
            if (cardSubscriptions) cardSubscriptions.style.setProperty('display', 'none', 'important');
        }

        // --- DİNAMİK BOŞLUK VE YUKARI KAYDIRMA AYARI ---
        if (hasAnyCard) {
            // Eğer en az bir kart görünür durumdaysa normal düzeni koru
            if (personalGrid) personalGrid.style.setProperty('display', 'grid', 'important');
            if (contentScroll) contentScroll.style.setProperty('padding-top', '120px', 'important');
        } else {
            // Eğer kullanıcının yetkili hiçbir kartı yoksa, üst boşluğu daralt ve alanı yok et (Projeler yukarı kayar)
            if (personalGrid) personalGrid.style.setProperty('display', 'none', 'important');
            if (contentScroll) contentScroll.style.setProperty('padding-top', '40px', 'important');
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
