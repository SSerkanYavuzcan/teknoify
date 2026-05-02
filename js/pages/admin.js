// js/pages/admin.js
import { logout, requireAuth } from "../lib/auth.js";
import { getProjects } from "../lib/data.js";
import { createEl, qs } from "../utils/dom.js";
import { db } from "../lib/firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc, // YENİ EKLENDİ: Silme işlemi için
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const IMPERSONATE_KEY = "teknoify_impersonate_uid";

function pickTbody() {
  return (
    qs("#admin-user-table-body") ||
    qs("#user-access-body") ||
    qs("#user-table-body") ||
    qs("#user-access-table tbody") ||
    document.querySelector("tbody")
  );
}

// GÜNCELLENDİ: Sadece hata mesajlarını gösterir, "Yükleniyor/Hazır" gibi yazıları gizler.
function setStatus(msg, type = "info") {
  let el = qs("#admin-status");
  if (!el) {
    el = createEl("div", { id: "admin-status", className: "admin-status" });
    const anchor = qs("#admin-status-anchor") || qs("main") || document.body;
    anchor.prepend(el);
  }

  if (type === "info" || type === "ok") {
    el.style.display = "none"; // Gereksiz yazıları gizle
  } else {
    el.style.display = "block";
    el.textContent = msg || "";
    el.className = `admin-status admin-status--${type}`;
  }
}

function ensureButton(selectorList, fallbackText) {
  const selectors = Array.isArray(selectorList) ? selectorList : [selectorList];
  for (const sel of selectors) {
    const btn = qs(sel);
    if (btn) return btn;
  }

  const btn = createEl("button", {
    className: "btn btn-primary admin-save-btn",
    text: fallbackText
  });
  btn.type = "button";

  const anchor = qs("#admin-actions") || qs("main") || document.body;
  anchor.append(btn);
  return btn;
}

function getImpersonatedUid() {
  try {
    return localStorage.getItem(IMPERSONATE_KEY) || localStorage.getItem("tk_impersonate_uid") || "";
  } catch {
    return "";
  }
}

function setImpersonatedUid(uid, name = "") {
  try {
    if (!uid) {
      localStorage.removeItem(IMPERSONATE_KEY);
      localStorage.removeItem("tk_impersonate_uid");
    } else {
      localStorage.setItem(IMPERSONATE_KEY, uid);
      localStorage.removeItem("tk_impersonate_uid");
    }
  } catch {
    // ignore
  }
}

// GÜNCELLENDİ: Aktif değilse gereksiz yazıyı tamamen gizler
function renderImpersonationBanner({ isAdmin }) {
  const current = getImpersonatedUid();
  if (!isAdmin) return;

  const wrap = qs("#impersonation-banner");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (!current) {
    wrap.style.display = "none"; // Tamamen gizle
    return;
  }

  wrap.style.display = "flex"; // Sadece aktifse göster
  wrap.classList.remove("is-empty");
  const left = createEl("div", {
    className: "impersonation-label",
    text: `İmpersonation aktif: ${current}`
  });

  const stopBtn = createEl("button", {
    className: "btn btn-sm btn-outline",
    text: "İmpersonation’ı Bitir"
  });
  stopBtn.type = "button";
  stopBtn.addEventListener("click", () => {
    setImpersonatedUid("");
    window.location.reload();
  });

  wrap.append(left, stopBtn);
}

async function fetchUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
}

async function fetchEntitlements(uid) {
  const entRef = doc(db, "entitlements", uid);
  const entSnap = await getDoc(entRef);
  const data = entSnap.exists() ? entSnap.data() : {};
  const ids = Array.isArray(data.projectIds) ? data.projectIds : [];
  return ids;
}

async function saveEntitlements(uid, projectIds) {
  const entRef = doc(db, "entitlements", uid);
  await setDoc(
    entRef,
    {
      projectIds: Array.isArray(projectIds) ? projectIds : [],
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function makeCheckbox({ checked, onChange }) {
  const input = createEl("input", { className: "service-checkbox" });
  input.type = "checkbox";
  input.checked = !!checked;
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

function goToUserAs(uid) {
  setImpersonatedUid(uid);
  window.location.href = "/dashboard/index.html";
}

// ----------------------------------------------------
// GÜNCELLENEN SATIR OLUŞTURMA (CREATE ROW)
// ----------------------------------------------------
function createRow({ user, projects, entitledSet, stateMap, session }) {
  const tr = createEl("tr", { className: "admin-row" });

  const profile = user.profile || {};

  // 1. SÜTUN: KULLANICI BİLGİLERİ
  const tdUser = createEl("td", { className: "admin-user-cell" });
  
  const fullName = profile.fullName || user.fullName || user.name || (profile.email ? profile.email.split("@")[0] : "İsimsiz Kullanıcı");
  const email = profile.email || user.email || "Email belirtilmemiş";
  
  const nameLine = createEl("div", { className: "admin-user-name" });
  nameLine.innerHTML = `<strong>${fullName}</strong> <span style="font-size: 0.85em; opacity: 0.6; font-weight: normal;">(${user.id})</span>`;
  
  const emailLine = createEl("div", { 
      className: "admin-user-meta", 
      text: email 
  });
  emailLine.style.color = "#a1a1aa";
  emailLine.style.fontSize = "0.85em";
  emailLine.style.marginTop = "2px";
  
  tdUser.append(nameLine, emailLine);

  // 2. SÜTUN: ŞİRKET (YENİ EKLENDİ)
  const tdCompany = createEl("td", { className: "admin-company-cell" });
  tdCompany.style.verticalAlign = "middle";
  const companyName = profile.companyName || "-";
  tdCompany.innerHTML = `<span style="color: #d4d4d8; font-size: 0.9em; font-weight: 500;">${companyName}</span>`;

  // 3. SÜTUN: ROL VE DURUM
  const tdRole = createEl("td", { className: "admin-role-cell" });
  tdRole.style.verticalAlign = "middle";
  
  const roleType = (typeof user.role === 'object' && user.role !== null) ? (user.role.type || 'member') : (user.role || 'member');
  const roleStatus = (typeof user.role === 'object' && user.role !== null) ? (user.role.status || 'active') : (user.status || 'active');

  const capRole = roleType.charAt(0).toUpperCase() + roleType.slice(1);
  const capStatus = roleStatus.charAt(0).toUpperCase() + roleStatus.slice(1);

  tdRole.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 0.85em; display: inline-block; width: fit-content; font-weight: 500; letter-spacing: 0.5px;">
              ${capRole}
          </span>
          <span style="background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 4px 10px; border-radius: 6px; font-size: 0.85em; display: inline-block; width: fit-content; font-weight: 500; letter-spacing: 0.5px;">
              ${capStatus}
          </span>
      </div>
  `;

  // 4. SÜTUN: PROJE ERİŞİMLERİ
  const tdProjects = createEl("td", { className: "admin-services-cell" });
  const wrap = createEl("div", { className: "admin-service-grid" });
  wrap.style.display = "flex";
  wrap.style.flexWrap = "wrap";
  wrap.style.gap = "6px";

  const accessObj = user.projectAccess || {};
  const allowedIds = Object.keys(accessObj).filter(k => accessObj[k] === true);

  if (allowedIds.length === 0) {
      wrap.innerHTML = `<span style="font-size: 0.85em; color: #a1a1aa; font-style: italic;">Erişim yok</span>`;
  } else {
      allowedIds.forEach(id => {
          const proj = projects.find(p => p.id === id);
          const pName = proj ? proj.name : id; 
          const badge = createEl("span", { text: pName });
          badge.style.cssText = "background: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 4px 10px; border-radius: 6px; font-size: 0.8em; font-weight: 500;";
          wrap.append(badge);
      });
  }
  
  tdProjects.append(wrap);

  // 5. SÜTUN: AKSİYONLAR (Bitir Butonu Kaldırıldı, Sil Butonu Eklendi)
  const tdActions = createEl("td", { className: "admin-actions-cell" });
  
  const impBtn = createEl("button", {
    className: "btn btn-sm btn-primary",
    text: "Kullanıcı Olarak Gör"
  });
  impBtn.type = "button";
  impBtn.disabled = !session.isAdmin;
  impBtn.addEventListener("click", () => goToUserAs(user.id));

  const deleteBtn = createEl("button", {
    className: "btn btn-sm",
    text: "Kullanıcıyı Kaldır",
    style: "margin-left: 8px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 12px; border-radius: 6px; font-weight: 500; cursor: pointer; transition: 0.2s;"
  });
  deleteBtn.type = "button";
  // Hover efekti
  deleteBtn.onmouseover = () => deleteBtn.style.background = "rgba(239, 68, 68, 0.25)";
  deleteBtn.onmouseout = () => deleteBtn.style.background = "rgba(239, 68, 68, 0.15)";
  
  // Silme İşlemi
  deleteBtn.addEventListener("click", async () => {
    if (confirm(`DİKKAT: ${email} kullanıcısını veritabanından silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
        try {
            // Firestore'dan kullanıcı dokümanını sil
            await deleteDoc(doc(db, "users", user.id));
            tr.remove(); // Tablodan satırı anında kaldır
            alert("Kullanıcı başarıyla silindi.");
        } catch (error) {
            console.error("Silme hatası:", error);
            alert("Kullanıcı silinirken bir hata oluştu!");
        }
    }
  });

  tdActions.append(impBtn, deleteBtn);

  // Tüm sütunları ekle (5 Sütun)
  tr.append(tdUser, tdCompany, tdRole, tdProjects, tdActions);
  return tr;
}

// ----------------------------------------------------
// İNİT FONKSİYONU
// ----------------------------------------------------
async function init() {
  try {
    const session = await requireAuth();
    if (!session) return;

    const logoutBtn =
      qs("#logout-btn") || qs("#logout") || qs("[data-action='logout']");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    if (!session.isAdmin) {
      setStatus("Bu sayfaya erişim yok (admin değilsiniz).", "error");
      return;
    }

    renderImpersonationBanner(session);

    const tbody = pickTbody();
    if (!tbody) {
      setStatus("Admin tablosu bulunamadı.", "error");
      return;
    }

    // 5 Sütunlu yeni Tablo Başlıkları (ŞİRKET eklendi)
    const table = tbody.parentElement;
    if (table && !table.querySelector("thead")) {
        const thead = createEl("thead");
        thead.innerHTML = `
            <tr>
                <th style="text-align: left; padding: 10px;">KULLANICI BİLGİLERİ</th>
                <th style="text-align: left; padding: 10px;">ŞİRKET</th>
                <th style="text-align: left; padding: 10px;">ROL & DURUM</th>
                <th style="text-align: left; padding: 10px;">PROJE ERİŞİMLERİ</th>
                <th style="text-align: right; padding: 10px;">AKSİYONLAR</th>
            </tr>
        `;
        table.prepend(thead);
    }

    const allProjects = await getProjects();
    const activeProjects = (allProjects || []).filter(
      (p) => p && p.status === "active"
    );

    const users = await fetchUsers();
    tbody.innerHTML = "";

    const stateMap = new Map();

    for (const user of users) {
      const entitled = await fetchEntitlements(user.id);
      const row = createRow({
        user,
        projects: activeProjects,
        entitledSet: entitled,
        stateMap,
        session
      });
      tbody.append(row);
    }

    const saveBtn = ensureButton(
      ["#save-btn", "#save-access-btn", "#save-entitlements", "[data-action='save']"],
      "Değişiklikleri Kaydet"
    );

    saveBtn.addEventListener("click", async () => {
      try {
        saveBtn.disabled = true;
        
        // Sadece kaydetme butonuna basıldığında butonun içini değiştirerek bilgi ver
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Kaydediliyor...";

        const writes = [];
        for (const [uid, setOfProjects] of stateMap.entries()) {
          const ids = Array.from(setOfProjects);
          writes.push(saveEntitlements(uid, ids));
        }
        await Promise.all(writes);

        saveBtn.innerText = originalText;
      } catch (e) {
        console.error(e);
        alert("Kaydetme hatası: " + (e?.message || "Bilinmeyen hata"));
      } finally {
        saveBtn.disabled = false;
      }
    });

  } catch (e) {
    console.error(e);
    setStatus("Admin sayfası başlatılamadı: " + (e?.message || "Bilinmeyen hata"), "error");
  }
}

init();
