// js/pages/member.js
import { logout as logoutFn, requireAuth } from "../lib/auth.js";
import { getUserEntitledProjectIds } from "../lib/data.js";
import { db } from "../lib/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// GÜVENLİK GÜNCELLEMESİ: XSS Koruması için yardımcı fonksiyon
function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? ""; // textContent her zaman güvenlidir
}

function hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = "none";
    }, 500);
}

function showAnalysisLink(show) {
    const analysisLink = document.getElementById("nav-link-analysis");
    if (!analysisLink) return;
    analysisLink.style.display = show ? "flex" : "none";
}

// GÜVENLİ BİLDİRİM RENDER SİSTEMİ
function renderNotifications(list) {
    const tbody = document.getElementById("notification-body");
    if (!tbody) return;

    tbody.innerHTML = ""; // İçeriği temizle

    if (!list || list.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = '<td colspan="3" style="padding:1rem; text-align:center; color:#666;">Henüz bildirim yok.</td>';
        tbody.appendChild(tr);
        return;
    }

    list.forEach((msg) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        
        // GÜVENLİK:innerHTML yerine yapısal yaklaşım veya escape işlemi
        // msg içeriğini asla doğrudan template literal içine koymuyoruz.
        const safeMsg = escapeHTML(msg); 
        
        tr.innerHTML = `
            <td style="padding: 1rem;">${safeMsg}</td>
            <td style="padding: 1rem;"><span style="color: #ef4444;"><i class="fas fa-envelope"></i> Okunmadı</span></td>
            <td style="padding: 1rem; color: #888;">Bugün</td>
        `;
        tbody.appendChild(tr);
    });
}

function fetchCSVCount(url) {
    const el = document.getElementById("processed-data-count");
    if (!el) return;

    if (typeof Papa === "undefined") {
        el.innerText = "-";
        return;
    }

    Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            const count = results.data.filter(
                (r) => r["Store Name"] && String(r["Store Name"]).trim() !== ""
            ).length;

            el.innerText = new Intl.NumberFormat("tr-TR").format(count);
        },
        error: function () {
            el.innerText = "Hata";
        }
    });
}

// ---- Impersonation helpers ----
function getImpersonatedUidFromStorage() {
    // Sadece bir tane anahtar kullanmak daha güvenli ve temizdir
    return localStorage.getItem("teknoify_impersonate_uid") || null;
}

function getEffectiveUserId(session) {
    const imp = getImpersonatedUidFromStorage();
    // GÜVENLİK: Sadece admin ise impersonate edebilir
    if (session?.role === "admin" && imp) return imp;
    return session.uid; // .userId yerine .uid (Firebase standartı)
}

// ---- Global UI helpers ----
window.toggleSidebar = function toggleSidebar() {
    document.body.classList.toggle("sidebar-closed");
};

window.logout = async function logout() {
    if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        await logoutFn();
    }
};

window.markAllAsRead = function markAllAsRead() {
    document.querySelectorAll(".fa-envelope").forEach((i) => {
        i.className = "fas fa-check-circle";
        i.parentElement.style.color = "#10b981";
        i.parentElement.innerHTML = '<i class="fas fa-check-circle"></i> Okundu';
    });
};

// ---- Main init ----
async function init() {
    try {
        const session = await requireAuth();
        if (!session) return;

        const effectiveUserId = getEffectiveUserId(session);

        // Profil Bilgileri
        const displayName = session.displayName || (session.email ? session.email.split("@")[0] : "User");

        setText("user-name-display", displayName);
        setText("user-name-title", displayName);
        setText("user-avatar", displayName.charAt(0).toUpperCase());

        // Yetkili Projeler
        const entitledIds = await getUserEntitledProjectIds(effectiveUserId);
        setText("stat-active-services", entitledIds.length);

        // Web Scraping menüsü görünürlüğü
        showAnalysisLink(entitledIds.includes("web_scraping"));

        // Veri Çekme
        const userSnap = await getDoc(doc(db, "users", effectiveUserId));
        const userDoc = userSnap.exists() ? userSnap.data() : {};

        const data = userDoc.data || {};
        const config = userDoc.config || {};

        setText("stat-saved-hours", data.savedHours || "0");
        setText("stat-next-payment", data.nextPayment || "Belirlenmedi");

        if (config.sheetUrl && String(config.sheetUrl).startsWith("https://")) {
            fetchCSVCount(config.sheetUrl);
        } else {
            setText("processed-data-count", data.totalProcessed || "0");
        }

        renderNotifications(data.notifications || []);
    } catch (err) {
        console.error("Dashboard yüklenirken hata:", err);
    } finally {
        hideLoadingOverlay();
    }
}

init();
