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

const IMPERSONATE_KEY = "tk_impersonate_uid";

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
    el = createEl("div", { id: "admin-status" });
    el.style.margin = "12px 0";
    el.style.fontSize = "14px";
    el.style.opacity = "0.95";
    const anchor = qs("main") || document.body;
    anchor.prepend(el);
  }

  el.textContent = msg || "";
  el.style.color =
    type === "error" ? "#ef4444" : type === "ok" ? "#10b981" : "#e5e7eb";
}

function ensureButton(selectorList, fallbackText) {
  const selectors = Array.isArray(selectorList) ? selectorList : [selectorList];
  for (const sel of selectors) {
    const btn = qs(sel);
    if (btn) return btn;
  }

  // yoksa üret
  const btn = createEl("button", {
    className: "btn btn-primary",
    text: fallbackText
  });
  btn.type = "button";
  btn.style.marginTop = "14px";

  const anchor = qs("main") || document.body;
  anchor.append(btn);
  return btn;
}

function getImpersonatedUid() {
  try {
    return localStorage.getItem(IMPERSONATE_KEY) || "";
  } catch {
    return "";
  }
}

function setImpersonatedUid(uid) {
  try {
    if (!uid) localStorage.removeItem(IMPERSONATE_KEY);
    else localStorage.setItem(IMPERSONATE_KEY, uid);
  } catch {
    // ignore
  }
}

function renderImpersonationBanner({ isAdmin }) {
  const current = getImpersonatedUid();
  if (!isAdmin) return;

  let wrap = qs("#impersonation-banner");
  if (!wrap) {
    wrap = createEl("div", { id: "impersonation-banner" });
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "space-between";
    wrap.style.gap = "12px";
    wrap.style.padding = "10px 12px";
    wrap.style.border = "1px solid rgba(255,255,255,0.08)";
    wrap.style.borderRadius = "12px";
    wrap.style.background = "rgba(255,255,255,0.03)";
    wrap.style.margin = "12px 0";

    const anchor = qs("main") || document.body;
    anchor.prepend(wrap);
  }

  wrap.innerHTML = "";
  if (!current) {
    wrap.append(
      createEl("div", { text: "İmpersonation aktif değil." }),
      createEl("div", { text: "" })
    );
    return;
  }

  const left = createEl("div", {
    text: `İmpersonation aktif: ${current}`
  });

  const stopBtn = createEl("button", {
    className: "btn btn-sm",
    text: "İmpersonation’ı Bitir"
  });
  stopBtn.type = "button";
  stopBtn.addEventListener("click", () => {
    setImpersonatedUid("");
    // admin sayfasında kal
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
  const input = createEl("input");
  input.type = "checkbox";
  input.checked = !!checked;
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

function ensureHeaderRow(tbody, projects) {
  // Eğer tablo başlığı HTML’de yoksa burada üretmek riskli,
  // ama en azından tbody yoksa uyaralım.
  if (!tbody) return;
  // tbody sadece body; header HTML tarafında kalsın
  // Bu fonksiyon şu an no-op.
}

function goToUserAs(uid) {
  // Admin.js sadece flag’i set eder.
  // requireAuth() tarafında bu uid’i “impersonated userId” olarak kullanman gerekir.
  setImpersonatedUid(uid);
  window.location.href = "/dashboard/index.html";
}

function createRow({ user, projects, entitledSet, stateMap, session }) {
  const tr = document.createElement("tr");
  tr.style.borderBottom = "1px solid rgba(255,255,255,0.06)";

  // User cell
  const tdUser = document.createElement("td");
  tdUser.style.padding = "14px 12px";
  tdUser.style.verticalAlign = "middle";

  const name = user.name || (user.email ? user.email.split("@")[0] : user.id);
  const userLine = createEl("div", { text: `${name} (${user.email || "-"})` });
  userLine.style.fontWeight = "600";

  const metaLine = createEl("div", {
    text: `UID: ${user.id} • role: ${user.role || "user"}`
  });
  metaLine.style.fontSize = "12px";
  metaLine.style.opacity = "0.75";
  metaLine.style.marginTop = "4px";

  const btns = createEl("div");
  btns.style.display = "flex";
  btns.style.gap = "8px";
  btns.style.marginTop = "10px";

  const impBtn = createEl("button", {
    className: "btn btn-sm btn-primary",
    text: "Impersonate"
  });
  impBtn.type = "button";
  impBtn.disabled = !session.isAdmin;
  impBtn.addEventListener("click", () => goToUserAs(user.id));

  const stopBtn = createEl("button", {
    className: "btn btn-sm",
    text: "İmpersonation’ı Bitir"
  });
  stopBtn.type = "button";
  stopBtn.disabled = !getImpersonatedUid();
  stopBtn.addEventListener("click", () => {
    setImpersonatedUid("");
    window.location.reload();
  });

  btns.append(impBtn, stopBtn);
  tdUser.append(userLine, metaLine, btns);

  // Project checkboxes cells
  const tdProjects = document.createElement("td");
  tdProjects.style.padding = "14px 12px";
  tdProjects.style.verticalAlign = "middle";

  const wrap = createEl("div");
  wrap.style.display = "flex";
  wrap.style.flexWrap = "wrap";
  wrap.style.gap = "14px";

  const setForUser = new Set(entitledSet);
  stateMap.set(user.id, setForUser);

  projects.forEach((p) => {
    const item = createEl("label");
    item.style.display = "inline-flex";
    item.style.alignItems = "center";
    item.style.gap = "8px";
    item.style.cursor = "pointer";

    const cb = makeCheckbox({
      checked: setForUser.has(p.id),
      onChange: (isChecked) => {
        const s = stateMap.get(user.id) || new Set();
        if (isChecked) s.add(p.id);
        else s.delete(p.id);
        stateMap.set(user.id, s);
      }
    });

    const text = createEl("span", { text: p.name });
    item.append(cb, text);
    wrap.append(item);
  });

  tdProjects.append(wrap);

  tr.append(tdUser, tdProjects);
  return tr;
}

async function init() {
  try {
    setStatus("Yükleniyor...");

    const session = await requireAuth();
    if (!session) return;

    // logout
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

    // projeler
    const allProjects = await getProjects();
    const activeProjects = (allProjects || []).filter(
      (p) => p && p.status === "active"
    );

    // kullanıcılar
    const users = await fetchUsers();

    // tablo render
    tbody.innerHTML = "";
    ensureHeaderRow(tbody, activeProjects);

    const stateMap = new Map(); // uid -> Set(projectId)

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

    // save button
    const saveBtn = ensureButton(
      ["#save-btn", "#save-access-btn", "[data-action='save']"],
      "Kaydet"
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
