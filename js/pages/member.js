// /dashboard/js/pages/member.js
import { db } from "../lib/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

async function loadDashboardData(sess) {
    try {
        console.log("[member.js] Veriler çekiliyor...", sess);
        const effectiveUid = sess.effectiveUid || sess.uid;
        const name = sess.name || sess.displayName || "Kullanıcı";
        
        // UI Güncelle
        document.getElementById("user-name-title").textContent = name;
        document.getElementById("user-name-display").textContent = name;
        const avatar = document.getElementById("user-avatar");
        if(avatar) avatar.textContent = name.charAt(0).toUpperCase();

        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            const projectAccess = userDoc.projectAccess || {};
            const entitledIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
            
            const activeServicesEl = document.getElementById("stat-active-services");
            if(activeServicesEl) activeServicesEl.textContent = entitledIds.length; 

            const statsData = userDoc.data || {};
            if(document.getElementById("stat-saved-hours")) document.getElementById("stat-saved-hours").textContent = statsData.savedHours || "0";
            if(document.getElementById("stat-next-payment")) document.getElementById("stat-next-payment").textContent = statsData.nextPayment || "Belirlenmedi";
            if(document.getElementById("processed-data-count")) document.getElementById("processed-data-count").textContent = statsData.totalProcessed || "0";
        }
    } catch (err) {
        console.error("[member.js] Dashboard veri hatası:", err);
    } finally {
        const overlay = document.getElementById("loading-overlay");
        if (overlay) { 
            overlay.style.opacity = "0"; 
            setTimeout(() => overlay.remove(), 800); 
        }
    }
}

function init() {
    // window.USER_SESSION gelene kadar her 200ms'de bir kontrol et
    const checkInterval = setInterval(() => {
        if (window.USER_SESSION) {
            clearInterval(checkInterval);
            loadDashboardData(window.USER_SESSION);
        }
    }, 200);

    // Yedek Plan: Eğer 10 saniye boyunca gelmezse ve Firebase login ise zorla çek
    setTimeout(() => {
        clearInterval(checkInterval);
        const overlay = document.getElementById("loading-overlay");
        if (overlay && overlay.style.opacity !== "0") {
             // Eğer hala kapanmadıysa bir sorun var demektir
             console.warn("[member.js] Oturum beklenenden uzun sürdü, manuel deneme yapılıyor...");
             if(!window.USER_SESSION) {
                const text = document.getElementById("dynamic-loader-text");
                if(text) text.innerHTML = "Oturum verisi alınamadı. <br><small>Sayfayı yenilemeyi deneyin.</small>";
             }
        }
    }, 10000);
}

init();
