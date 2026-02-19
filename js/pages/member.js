// js/pages/member.js
import { logout as logoutFn, requireAuth } from "../lib/auth.js";
import { getUserEntitledProjectIds } from "../lib/data.js";
import { db } from "../lib/firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
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

function renderNotifications(list) {
  const tbody = document.getElementById("notification-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" style="padding:1rem; text-align:center; color:#666;">Henüz bildirim yok.</td></tr>';
    return;
  }

  list.forEach((msg) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
    tr.innerHTML = `
      <td style="padding: 1rem;">${msg}</td>
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

// ---- Global UI helpers (HTML onclick çağırıyor) ----
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
    const session = await requireAuth(); // Firebase Auth + admin check
    if (!session) return;

    // Profil
    const displayName = session.name || (session.email ? session.email.split("@")[0] : "User");
    setText("user-name-display", displayName);
    setText("user-name-title", displayName);
    setText("user-avatar", displayName.charAt(0).toUpperCase());

    // Entitlements → aktif hizmetler + menü
    const entitledIds = await getUserEntitledProjectIds(session.userId);
    setText("stat-active-services", entitledIds.length);

    // Web Scraping menüsü: entitlement’a göre
    showAnalysisLink(entitledIds.includes("web_scraping"));

    // Opsiyonel: users/{uid} doc’undan data/config alanlarını oku (varsa)
    // users doc yapın şöyle olabilir:
    // { name, email, data: { savedHours, nextPayment, totalProcessed, notifications: [] }, config: { sheetUrl } }
    const userSnap = await getDoc(doc(db, "users", session.userId));
    const userDoc = userSnap.exists() ? userSnap.data() : {};

    const data = userDoc.data || {};
    const config = userDoc.config || {};

    setText("stat-saved-hours", data.savedHours || "-");
    setText("stat-next-payment", data.nextPayment || "-");

    if (config.sheetUrl && String(config.sheetUrl).length > 5) {
      fetchCSVCount(config.sheetUrl);
    } else {
      setText("processed-data-count", data.totalProcessed || "-");
    }

    renderNotifications(data.notifications || []);
  } finally {
    hideLoadingOverlay();
  }
}

init();
