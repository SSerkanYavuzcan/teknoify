// js/pages/member.js
import { db } from "../lib/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

async function loadDashboardData(sess) {
    try {
        const effectiveUid = sess.effectiveUid || sess.uid;

        // İsimleri hem burada hem globalde garantiye alalım
        const name = sess.name || sess.displayName || "Kullanıcı";
        document.getElementById("user-name-title").textContent = name;
        document.getElementById("user-name-display").textContent = name;
        document.getElementById("user-avatar").textContent = name.charAt(0).toUpperCase();

        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            const projectAccess = userDoc.projectAccess || {};
            const entitledIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
            
            document.getElementById("stat-active-services").textContent = entitledIds.length; 

            const statsData = userDoc.data || {};
            document.getElementById("stat-saved-hours").textContent = statsData.savedHours || "0";
            document.getElementById("stat-next-payment").textContent = statsData.nextPayment || "Belirlenmedi";
            document.getElementById("processed-data-count").textContent = statsData.totalProcessed || "0";
        }
    } catch (err) {
        console.error("Dashboard veri hatası:", err);
    } finally {
        const overlay = document.getElementById("loading-overlay");
        if (overlay) { overlay.style.opacity = "0"; setTimeout(() => overlay.remove(), 800); }
    }
}

function init() {
    let attempts = 0;
    const checkSession = setInterval(() => {
        attempts++;
        if (window.USER_SESSION) {
            clearInterval(checkSession);
            loadDashboardData(window.USER_SESSION);
        }
        if (attempts > 50) { // 5 saniye sonra zorla kapat
            clearInterval(checkSession);
            const overlay = document.getElementById("loading-overlay");
            if (overlay) overlay.remove();
        }
    }, 100);
}

init();
