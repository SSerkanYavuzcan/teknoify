/* js/pages/admin.js
   Teknoify Admin - User Access Management + Impersonate (View-as)
   Works with Firebase v9 compat (firebase-app-compat, firebase-auth-compat, firebase-firestore-compat)
*/

(() => {
  'use strict';

  // -----------------------------
  // CONFIG / CONSTANTS
  // -----------------------------
  const COL = {
    ADMINS: 'admins',
    USERS: 'users',
    ENTITLEMENTS: 'entitlements',
    PROJECTS: 'projects',
  };

  const LS = {
    IMP_UID: 'impersonate_uid',
    IMP_EMAIL: 'impersonate_email',
    IMP_NAME: 'impersonate_name',
  };

  // -----------------------------
  // STATE
  // -----------------------------
  let db;
  let authUser = null;
  let isAdmin = false;

  /** @type {Array<{id:string,name:string,status?:string,demoUrl?:string,description?:string}>} */
  let projects = [];
  /** @type {Array<{uid:string,name?:string,email?:string,role?:string}>} */
  let users = [];
  /** @type {Map<string, Set<string>>} uid -> projectIds set */
  const entByUid = new Map();
  /** @type {Set<string>} dirty uids */
  const dirtyUids = new Set();

  // -----------------------------
  // HELPERS
  // -----------------------------
  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getRootEl() {
    return (
      document.getElementById('admin-root') ||
      document.getElementById('users-container') ||
      document.getElementById('app') ||
      document.querySelector('.admin-content') ||
      document.body
    );
  }

  function toast(msg) {
    // Eğer sitende toast component varsa burayı entegre edebilirsin.
    // Şimdilik minimal:
    console.log('[ADMIN]', msg);
  }

  function hardRedirectToLogin() {
    // Projene göre login yolu farklıysa güncelle:
    window.location.href = '../index.html';
  }

  function goDashboard() {
    window.location.href = 'index.html';
  }

  function serverTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  function normalizeProjectIds(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    return [];
  }

  // -----------------------------
  // IMPERSONATION
  // -----------------------------
  function startImpersonation(targetUid, targetEmail, targetName) {
    localStorage.setItem(LS.IMP_UID, targetUid);
    localStorage.setItem(LS.IMP_EMAIL, targetEmail || '');
    localStorage.setItem(LS.IMP_NAME, targetName || '');
    goDashboard();
  }

  function stopImpersonation() {
    localStorage.removeItem(LS.IMP_UID);
    localStorage.removeItem(LS.IMP_EMAIL);
    localStorage.removeItem(LS.IMP_NAME);
    // sayfayı yenile
    window.location.reload();
  }

  function getImpersonationInfo() {
    const uid = localStorage.getItem(LS.IMP_UID);
    if (!uid) return null;
    return {
      uid,
      email: localStorage.getItem(LS.IMP_EMAIL) || '',
      name: localStorage.getItem(LS.IMP_NAME) || '',
    };
  }

  // -----------------------------
  // FIREBASE GUARDS
  // -----------------------------
  async function checkAdmin(uid) {
    const doc = await db.collection(COL.ADMINS).doc(uid).get();
    return doc.exists;
  }

  // -----------------------------
  // DATA LOADERS
  // -----------------------------
  async function loadProjects() {
    // Sadece aktif projeler + isim sıralı (yoksa hepsini al)
    let snap;
    try {
      snap = await db.collection(COL.PROJECTS).where('status', '==', 'active').get();
    } catch (e) {
      // index/where yoksa fallback
      snap = await db.collection(COL.PROJECTS).get();
    }

    const list = [];
    snap.forEach((d) => {
      const data = d.data() || {};
      list.push({
        id: d.id,
        name: data.name || d.id,
        status: data.status || '',
        demoUrl: data.demoUrl || '',
        description: data.description || '',
      });
    });

    list.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, 'tr'));
    projects = list;
  }

  async function loadUsers() {
    const snap = await db.collection(COL.USERS).get();
    const list = [];
    snap.forEach((d) => {
      const data = d.data() || {};
      list.push({
        uid: d.id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || '',
      });
    });

    // İsim/email sıralı
    list.sort((a, b) => {
      const A = (a.name || a.email || a.uid).toLowerCase();
      const B = (b.name || b.email || b.uid).toLowerCase();
      return A.localeCompare(B, 'tr');
    });

    users = list;
  }

  async function loadEntitlements() {
    entByUid.clear();
    const snap = await db.collection(COL.ENTITLEMENTS).get();
    snap.forEach((d) => {
      const data = d.data() || {};
      const set = new Set(normalizeProjectIds(data.projectIds));
      entByUid.set(d.id, set);
    });

    // entitlements dokümanı olmayan kullanıcılar için boş set oluştur
    users.forEach((u) => {
      if (!entByUid.has(u.uid)) entByUid.set(u.uid, new Set());
    });
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  function render() {
    const root = getRootEl();
    const imp = getImpersonationInfo();

    root.innerHTML = `
      <div class="admin-panel" style="max-width:1100px; margin:0 auto; padding:22px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px;">
          <div>
            <h2 style="margin:0; font-size:1.4rem;">Kullanıcı Erişim Yönetimi</h2>
            <div style="opacity:.75; margin-top:6px; font-size:.95rem;">
              Kullanıcılara proje erişimi atayın veya kaldırın.
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            ${
              imp
                ? `<div style="padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06);">
                     <span style="opacity:.85;">Impersonating:</span>
                     <strong>${escapeHtml(imp.name || imp.email || imp.uid)}</strong>
                     <button id="btn-stop-imp" style="margin-left:10px; padding:6px 10px; border-radius:8px; cursor:pointer;">Çık</button>
                   </div>`
                : ``
            }
            <button id="btn-refresh" style="padding:10px 14px; border-radius:10px; cursor:pointer;">
              Yenile
            </button>
            <button id="btn-save" style="padding:10px 14px; border-radius:10px; cursor:pointer; background:rgba(115,103,240,0.25); border:1px solid rgba(115,103,240,0.35);">
              Kaydet
            </button>
          </div>
        </div>

        <div style="overflow:auto; border:1px solid rgba(255,255,255,0.10); border-radius:14px;">
          <table style="width:100%; border-collapse:collapse; min-width:720px;">
            <thead>
              <tr style="background:rgba(255,255,255,0.04);">
                <th style="text-align:left; padding:14px 12px; border-bottom:1px solid rgba(255,255,255,0.08);">User</th>
                ${projects
                  .map(
                    (p) => `
                      <th style="text-align:center; padding:14px 12px; border-bottom:1px solid rgba(255,255,255,0.08);">
                        ${escapeHtml(p.name || p.id)}
                      </th>
                    `
                  )
                  .join('')}
                <th style="text-align:center; padding:14px 12px; border-bottom:1px solid rgba(255,255,255,0.08);">Aksiyon</th>
              </tr>
            </thead>
            <tbody id="users-tbody">
              ${users.map((u) => renderUserRow(u)).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:12px; opacity:.7; font-size:.9rem;">
          Not: Kaydet butonu sadece değişen kullanıcıların <code>entitlements/{UID}</code> dokümanlarını günceller.
        </div>
      </div>
    `;

    // bind
    const btnSave = root.querySelector('#btn-save');
    const btnRefresh = root.querySelector('#btn-refresh');
    const btnStopImp = root.querySelector('#btn-stop-imp');

    btnSave?.addEventListener('click', onSave);
    btnRefresh?.addEventListener('click', async () => {
      await reloadAll();
    });
    btnStopImp?.addEventListener('click', stopImpersonation);

    // checkbox + impersonate handlers
    bindRowHandlers(root);
  }

  function renderUserRow(u) {
    const set = entByUid.get(u.uid) || new Set();
    const displayName = (u.name || '').trim();
    const email = (u.email || '').trim();
    const title = displayName
      ? `${displayName}${email ? ` (${email})` : ''}`
      : email || u.uid;

    const roleLabel = (u.role || '').trim() || 'user';

    return `
      <tr data-uid="${escapeHtml(u.uid)}" style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="padding:14px 12px;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-weight:600;">${escapeHtml(title)}</div>
            <div style="opacity:.7; font-size:.88rem;">
              <span style="padding:2px 8px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05);">
                ${escapeHtml(roleLabel)}
              </span>
              <span style="opacity:.6; margin-left:8px; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
                ${escapeHtml(u.uid)}
              </span>
            </div>
          </div>
        </td>

        ${projects
          .map((p) => {
            const checked = set.has(p.id) ? 'checked' : '';
            return `
              <td style="text-align:center; padding:14px 12px;">
                <input type="checkbox" class="proj-check" data-proj="${escapeHtml(p.id)}" ${checked} />
              </td>
            `;
          })
          .join('')}

        <td style="text-align:center; padding:14px 12px;">
          <button class="btn-imp" style="padding:8px 12px; border-radius:10px; cursor:pointer; border:1px solid rgba(255,255,255,0.12); background:rgba(115,103,240,0.15); color:#fff;">
            Impersonate
          </button>
        </td>
      </tr>
    `;
  }

  function bindRowHandlers(root) {
    root.querySelectorAll('tr[data-uid]').forEach((tr) => {
      const uid = tr.getAttribute('data-uid');
      if (!uid) return;

      // checkbox changes
      tr.querySelectorAll('.proj-check').forEach((cb) => {
        cb.addEventListener('change', () => {
          const projId = cb.getAttribute('data-proj');
          if (!projId) return;

          const set = entByUid.get(uid) || new Set();
          if (cb.checked) set.add(projId);
          else set.delete(projId);

          entByUid.set(uid, set);
          dirtyUids.add(uid);

          // görsel mini feedback: satırı hafif işaretle
          tr.style.background = 'rgba(255,255,255,0.03)';
        });
      });

      // impersonate button
      const btnImp = tr.querySelector('.btn-imp');
      btnImp?.addEventListener('click', () => {
        const u = users.find((x) => x.uid === uid);
        startImpersonation(uid, u?.email || '', u?.name || '');
      });
    });
  }

  // -----------------------------
  // SAVE
  // -----------------------------
  async function onSave() {
    if (dirtyUids.size === 0) {
      alert('Değişiklik yok.');
      return;
    }

    const btn = document.getElementById('btn-save');
    if (btn) btn.disabled = true;

    try {
      // Küçük dataset ise tek tek set yeterli.
      // İstersen batch ile de yapılır (500 limit).
      const uids = Array.from(dirtyUids);

      for (const uid of uids) {
        const set = entByUid.get(uid) || new Set();
        const projectIds = Array.from(set);

        await db.collection(COL.ENTITLEMENTS).doc(uid).set(
          {
            projectIds,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      dirtyUids.clear();
      alert('Kaydedildi ✅');
      await reloadAll(); // tekrar yükle, state temizlensin
    } catch (e) {
      console.error(e);
      alert('Kaydetme sırasında hata oluştu. Console’u kontrol et.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // -----------------------------
  // RELOAD
  // -----------------------------
  async function reloadAll() {
    const root = getRootEl();
    root.innerHTML = `<div style="padding:24px; max-width:900px; margin:0 auto;">Yükleniyor...</div>`;

    await loadProjects();
    await loadUsers();
    await loadEntitlements();

    // dirty reset
    dirtyUids.clear();
    render();
  }

  // -----------------------------
  // INIT
  // -----------------------------
  async function init() {
    try {
      if (typeof firebase === 'undefined') {
        throw new Error('firebase global not found. Firebase scripts are not loaded.');
      }

      db = firebase.firestore();

      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          hardRedirectToLogin();
          return;
        }

        authUser = user;

        // admin guard
        isAdmin = await checkAdmin(authUser.uid);
        if (!isAdmin) {
          alert('Bu sayfaya erişim yetkiniz yok.');
          goDashboard();
          return;
        }

        await reloadAll();
      });
    } catch (e) {
      console.error(e);
      const root = getRootEl();
      root.innerHTML = `
        <div style="padding:24px; max-width:900px; margin:0 auto; color:#ef4444;">
          Admin sayfası başlatılamadı: ${escapeHtml(e.message || String(e))}
        </div>
      `;
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
