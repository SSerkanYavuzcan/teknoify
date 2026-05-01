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

function setStatus(msg, type = "info") {
  let el = qs("#admin-status");
  if (!el) {
    el = createEl("div", { id: "admin-status", className: "admin-status" });
    const anchor = qs("#admin-status-anchor") || qs("main") || document.body;
    anchor.prepend(el);
  }

  el.textContent = msg || "";
  el.className = `admin-status admin-status--${type}`;
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

function renderImpersonationBanner({ isAdmin }) {
  const current = getImpersonatedUid();
  if (!isAdmin) return;

  const wrap = qs("#impersonation-banner");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (!current) {
    wrap.classList.add("is-empty");
    wrap.append(
      createEl("span", { className: "impersonation-label", text: "İmpersonation aktif değil" }),
      createEl("span", { className: "impersonation-hint", text: "Bir kullanıcıyı seçerek oturumu test edebilirsiniz." })
    );
    return;
  }

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
// YENİ: CREATE ROW FONKSİYONU GÜNCELLENDİ
// ----------------------------------------------------
function createRow({ user, projects, entitledSet, stateMap, session }) {
  const tr = createEl("tr", { className: "admin-row" });

  // 1. SÜTUN: KULLANICI BİLGİLERİ (İsim(ID) ve Altında Email)
  const tdUser = createEl("td", { className: "admin-user-cell" });
  const fullName = user.fullName || user.name || (user.email ? user.email.split("@")[0] : "İsimsiz Kullanıcı");
  
  const nameLine = createEl("div", { className: "admin-user-name" });
  nameLine.innerHTML = `<strong>${fullName}</strong> <span style="font-size: 0.85em; opacity: 0.6; font-weight: normal;">(${user.id})</span>`;
  
  const emailLine = createEl("div", { 
      className: "admin-user-meta", 
      text: user.email || "Email belirtilmemiş" 
  });
  emailLine.style.color = "#a1a1aa";
  emailLine.style.fontSize = "0.85em";
  emailLine.style.marginTop = "2px";
  
  tdUser.append(nameLine, emailLine);

  // 2. SÜTUN: ROL VE DURUM
  const tdRole = createEl("td", { className: "admin-role-cell" });
  tdRole.style.verticalAlign = "middle";
  
  // Obje kontrolü (type ve status bilgisini çekmek için)
  const roleType = (typeof user.role === 'object' && user.role !== null) ? (user.role.type || 'Belirtilmemiş') : (user.role || 'user');
  const roleStatus = (typeof user.role === 'object' && user.role !== null) ? (user.role.status || 'Belirtilmemiş') : (user.status || 'Aktif');

  tdRole.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8em; display: inline-block; width: fit-content;">
              Rol: <strong>${roleType}</strong>
          </span>
          <span style="background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; display: inline-block; width: fit-content;">
              Durum: <strong>${roleStatus}</strong>
          </span>
      </div>
  `;

  // 3. SÜTUN: PROJE ERİŞİMLERİ (Checkboxlar)
  const tdProjects = createEl("td", { className: "admin-services-cell" });
  const wrap = createEl("div", { className: "admin-service-grid" });

  const setForUser = new Set(entitledSet);
  stateMap.set(user.id, setForUser);

  projects.forEach((p) => {
    const item = createEl("label", { className: "service-pill" });

    const cb = makeCheckbox({
      checked: setForUser.has(p.id),
      onChange: (isChecked) => {
        const s = stateMap.get(user.id) || new Set();
        if (isChecked) s.add(p.id);
        else s.delete(p.id);
        stateMap.set(user.id, s);
      }
    });

    const text = createEl("span", { className: "service-pill-text", text: p.name });
    item.append(cb, text);
    wrap.append(item);
  });

  tdProjects.append(wrap);

  // 4. SÜTUN: AKSİYONLAR
  const tdActions = createEl("td", { className: "admin-actions-cell" });
  const impBtn = createEl("button", {
    className: "btn btn-sm btn-primary",
    text: "Kullanıcı Olarak Gör"
  });
  impBtn.type = "button";
  impBtn.disabled = !session.isAdmin;
  impBtn.addEventListener("click", () => goToUserAs(user.id));

  const stopBtn = createEl("button", {
    className: "btn btn-sm btn-outline",
    text: "Bitir",
    style: "margin-left: 5px;"
  });
  stopBtn.type = "button";
  stopBtn.disabled = !getImpersonatedUid();
  stopBtn.addEventListener("click", () => {
    setImpersonatedUid("");
    window.location.reload();
  });

  tdActions.append(impBtn, stopBtn);

  // Satıra tüm sütunları ekle (4 Sütun oldu)
  tr.append(tdUser, tdRole, tdProjects, tdActions);
  return tr;
}

// ----------------------------------------------------
// İNİT FONKSİYONU
// ----------------------------------------------------
async function init() {
  try {
    setStatus("Yükleniyor...");

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
      setStatus(
        "Admin tablosu bulunamadı. HTML’de bir <tbody> (örn: id='admin-user-table-body') olmalı.",
        "error"
      );
      return;
    }

    // Tablonun 4 sütunlu olduğundan emin olmak için Thead ekleyelim (Eğer yoksa)
    const table = tbody.parentElement;
    if (table && !table.querySelector("thead")) {
        const thead = createEl("thead");
        thead.innerHTML = `
            <tr>
                <th style="text-align: left; padding: 10px;">KULLANICI BİLGİLERİ</th>
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
        setStatus("Kaydediliyor...");

        const writes = [];
        for (const [uid, setOfProjects] of stateMap.entries()) {
          const ids = Array.from(setOfProjects);
          writes.push(saveEntitlements(uid, ids));
        }
        await Promise.all(writes);

        setStatus("Kaydedildi ✅", "ok");
      } catch (e) {
        console.error(e);
        setStatus("Kaydetme hatası: " + (e?.message || "Bilinmeyen hata"), "error");
      } finally {
        saveBtn.disabled = false;
      }
    });

    setStatus("Hazır ✅", "ok");
  } catch (e) {
    console.error(e);
    setStatus("Admin sayfası başlatılamadı: " + (e?.message || "Bilinmeyen hata"), "error");
  }
}

init();
