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

function createRow({ user, projects, entitledSet, stateMap, session }) {
  const tr = createEl("tr", { className: "admin-row" });

  const tdUser = createEl("td", { className: "admin-user-cell" });
  const name = user.name || (user.email ? user.email.split("@")[0] : user.id);
  const userLine = createEl("div", {
    className: "admin-user-name",
    text: `${name} (${user.email || "-"})`
  });

  const metaLine = createEl("div", {
    className: "admin-user-meta",
    text: `UID: ${user.id} • role: ${user.role || "user"}`
  });
  tdUser.append(userLine, metaLine);

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
    text: "Bitir"
  });
  stopBtn.type = "button";
  stopBtn.disabled = !getImpersonatedUid();
  stopBtn.addEventListener("click", () => {
    setImpersonatedUid("");
    window.location.reload();
  });

  tdActions.append(impBtn, stopBtn);

  tr.append(tdUser, tdProjects, tdActions);
  return tr;
}

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
