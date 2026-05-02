// js/pages/member.js
import { logout as logoutFn, requireAuth } from "../lib/auth.js";
import { db } from "../lib/firebase.js";
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
    if (el) el.textContent = text ?? "";
}

function hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = "none";
    }, 600);
}

function renderNotifications(list) {
    const tbody = document.getElementById("notification-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="padding:1.5rem; text-align:center; color:#475569;">Henüz bir bildirim bulunmuyor.</td></tr>';
        return;
    }

    list.forEach((msg) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
        tr.innerHTML = `
            <td style="padding: 1rem; color: #cbd5e1;">${escapeHTML(msg)}</td>
            <td style="padding: 1rem;"><span style="color: #6366f1;"><i class="fas fa-circle" style="font-size:8px;"></i> Yeni</span></td>
            <td style="padding: 1rem; color: #475569; font-size:11px;">Şimdi</td>
        `;
        tbody.appendChild(tr);
    });
}

async function init() {
    try {
        const session = await requireAuth();
        if (!session) return;

        // sidebar.js'in veritabanına bağlanabilmesi için global erişim veriyoruz
        window.db = db; 

        // Admin Rolü Doğru Kontrolü (Rol obje de olsa string de olsa yakalayacak)
        const isAdmin = session.role?.type === "admin" || session.isAdmin === true || session.role === "admin";
        const impUid = localStorage.getItem("teknoify_impersonate_uid");
        
        // Eğer admin impersonate yapıyorsa onun UID'sine bak, yoksa normal UID
        const effectiveUserId = (isAdmin && impUid) ? impUid : session.uid;

        const displayName = session.name || session.displayName || (session.email ? session.email.split("@")[0] : "Değerli Kullanıcımız");
        setText("user-name-display", displayName);
        setText("user-name-title", displayName);
        setText("user-avatar", displayName.charAt(0).toUpperCase());

        const userSnap = await getDoc(doc(db, "users", effectiveUserId));
        let entitledIds = [];
        
        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            
            const projectAccess = userDoc.projectAccess || {};
            entitledIds = Object.keys(projectAccess).filter(k => projectAccess[k] === true);
            
            setText("stat-active-services", entitledIds.length); 
            
            const statsData = userDoc.data || {};
            setText("stat-saved-hours", statsData.savedHours || "0");
            setText("stat-next-payment", statsData.nextPayment || "Belirlenmedi");
            setText("processed-data-count", statsData.totalProcessed || "0");

            renderNotifications(statsData.notifications || []);
        }

        window.USER_SESSION = {
            ...session,
            projectIds: entitledIds
        };

        // Menüyü Çizdir!
        if (typeof window.TK_RENDER_SIDEBAR === "function") {
            window.TK_RENDER_SIDEBAR();
        }

    } catch (err) {
        console.error("Dashboard yüklenirken kritik hata:", err);
    } finally {
        hideLoadingOverlay();
    }
}

window.logout = async () => { if (confirm("Çıkış yapmak istediğinize emin misiniz?")) await logoutFn(); };
window.toggleSidebar = () => { document.body.classList.toggle("sidebar-closed"); };
window.markAllAsRead = () => { 
    const tbody = document.getElementById("notification-body");
    if(tbody) tbody.style.opacity = "0.5";
    alert("Tüm bildirimler okundu olarak işaretlendi."); 
};

init();
