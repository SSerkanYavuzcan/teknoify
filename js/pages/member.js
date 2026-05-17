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
 * DASHBOARD VERİ YÜKLEYİCİ (DİNAMİK YETKİ KONTROLLERİ EKLENDİ)
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

        // 2. Firestore'dan Kullanıcı Dokümanını Oku
        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            const userData = userDoc.data || {};

            // --- FİNANS VERİLERİ VE KART ERİŞİM KONTROLÜ ---
            if (userData.finance) {
                if (cardFinance) cardFinance.style.display = "flex"; // Yetki varsa göster
                updateUI("portfolio-value", "₺" + (userData.finance.portfolio || "385.240"));
                updateUI("monthly-savings", "₺" + (userData.finance.savings || "12.430"));
            } else {
                if (cardFinance) cardFinance.style.display = "none"; // Yetki yoksa tamamen gizle
            }

            // --- SAĞLIK VERİLERİ VE KART ERİŞİM KONTROLÜ ---
            if (userData.health) {
                if (cardHealth) cardHealth.style.display = "flex"; // Yetki varsa göster
                updateUI("user-weight", userData.health.weight || "74.8");
                updateUI("sleep-duration", userData.health.sleep || "7s 24dk");
            } else {
                if (cardHealth) cardHealth.style.display = "none"; // Yetki yoksa tamamen gizle
            }
            
            // --- VERİMLİLİK KARTI ERİŞİM KONTROLÜ ---
            if (userData.productivity) {
                if (cardProductivity) cardProductivity.style.display = "flex";
                // Gelecekte eklemek isteyeceğiniz verimlilik dinamik UI güncellemelerini buraya yazabilirsiniz.
            } else {
                if (cardProductivity) cardProductivity.style.display = "none"; // Yetki yoksa gizle
            }

            // --- ABONELİKLER KARTI ERİŞİM KONTROLÜ ---
            if (userData.subscriptions) {
                if (cardSubscriptions) cardSubscriptions.style.display = "flex";
                // Gelecekte eklemek isteyeceğiniz abonelik dinamik UI güncellemelerini buraya yazabilirsiniz.
            } else {
                if (cardSubscriptions) cardSubscriptions.style.display = "none"; // Yetki yoksa gizle
            }
            
            // Eğer sidebar.js yüklüyse menüyü tetikle
            if (typeof window.TK_RENDER_SIDEBAR === "function") {
                window.TK_RENDER_SIDEBAR();
            }
        } else {
            // Kullanıcının Firestore'da hiçbir dokümanı veya yetkisi yoksa tüm kartları gizle
            if (cardFinance) cardFinance.style.display = "none";
            if (cardHealth) cardHealth.style.display = "none";
            if (cardProductivity) cardProductivity.style.display = "none";
            if (cardSubscriptions) cardSubscriptions.style.display = "none";
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
