// js/pages/admin.js
import { logout, requireAuth } from "../lib/auth.js";
import { getProjects } from "../lib/data.js";
import { createEl, qs } from "../utils/dom.js";
import { auth, db } from "../lib/firebase.js";

import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc
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

  if (type === "info" || type === "ok") {
    el.style.display = "none"; 
  } else {
    el.style.display = "block";
    el.textContent = msg || "";
    el.className = `admin-status admin-status--${type}`;
  }
}

function getImpersonatedUid() {
  try {
    return localStorage.getItem(IMPERSONATE_KEY) || localStorage.getItem("tk_impersonate_uid") || "";
  } catch {
    return "";
  }
}

function setImpersonatedUid(uid) {
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
    wrap.style.display = "none";
    return;
  }

  wrap.style.display = "flex";
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

function goToUserAs(uid) {
  setImpersonatedUid(uid);
  window.location.href = "/dashboard/index.html";
}

// ----------------------------------------------------
// YENİ: KULLANICI AYARLARI PENCERESİ (MODAL)
// ----------------------------------------------------
function openUserSettingsModal(user, allProjects) {
  const profile = user.profile || {};
  const role = user.role || {};
  const currentAccess = user.projectAccess || {};

  // Arka plan karartması
  const overlay = createEl("div");
  overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 9998; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);";

  // Modal Kutusu
  const modal = createEl("div");
  modal.style.cssText = "background: #18181b; border: 1px solid #3f3f46; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 9999; color: white;";

  // Ortak input stilleri
  const inputStyle = "width: 100%; padding: 10px; margin-top: 6px; background: #27272a; border: 1px solid #3f3f46; color: white; border-radius: 6px; box-sizing: border-box; font-size: 0.9em;";
  const labelStyle = "display: block; margin-top: 16px; font-size: 0.85em; color: #a1a1aa; font-weight: 500;";

  // Form HTML İçeriği
  modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #3f3f46; padding-bottom: 10px;">
          <h2 style="margin: 0; font-size: 1.2em;">Kullanıcı Ayarları</h2>
          <button id="close-modal-btn" style="background: none; border: none; color: #a1a1aa; font-size: 1.5em; cursor: pointer;">&times;</button>
      </div>

      <label style="${labelStyle}">Ad Soyad
          <input type="text" id="m-name" value="${profile.fullName || ''}" style="${inputStyle}">
      </label>

      <label style="${labelStyle}">Şirket
          <input type="text" id="m-company" value="${profile.companyName || ''}" style="${inputStyle}">
      </label>

      <label style="${labelStyle}">Profil Fotoğrafı URL (Opsiyonel)
          <input type="text" id="m-photo" value="${profile.photoURL || ''}" style="${inputStyle}" placeholder="https://...">
      </label>

      <div style="display: flex; gap: 10px;">
          <label style="${labelStyle}; flex: 1;">Hesap Durumu
              <select id="m-status" style="${inputStyle}">
                  <option value="active" ${role.status === 'active' ? 'selected' : ''}>Aktif</option>
                  <option value="suspended" ${role.status === 'suspended' ? 'selected' : ''}>Askıda</option>
              </select>
          </label>
          <label style="${labelStyle}; flex: 1;">Yetki Rolü
              <select id="m-role" style="${inputStyle}">
                  <option value="member" ${role.type === 'member' ? 'selected' : ''}>Member</option>
                  <option value="premium" ${role.type === 'premium' ? 'selected' : ''}>Premium</option>
                  <option value="admin" ${role.type === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
          </label>
      </div>

      <div style="margin-top: 24px;">
          <h3 style="font-size: 0.95em; color: #e4e4e7; margin-bottom: 10px;">Projeler & Yetkilendirme</h3>
          <div id="m-projects" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #27272a; padding: 12px; border-radius: 8px; border: 1px solid #3f3f46;">
              </div>
      </div>

      <div style="margin-top: 24px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 16px; border-radius: 8px;">
          <h3 style="font-size: 0.95em; color: #60a5fa; margin: 0 0 10px 0;">Şifre Yönetimi</h3>
          <p style="font-size: 0.8em; color: #9ca3af; margin-bottom: 12px; line-height: 1.4;">Güvenlik politikaları gereği şifre doğrudan değiştirilemez. Kullanıcının tanımlı mail adresine şifre sıfırlama bağlantısı gönderebilirsiniz.</p>
          <button id="btn-reset-pw" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85em; font-weight: 500;">Sıfırlama Bağlantısı Gönder</button>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end;">
          <button id="btn-cancel" style="background: transparent; color: white; border: 1px solid #3f3f46; padding: 10px 20px; border-radius: 6px; cursor: pointer;">İptal</button>
          <button id="btn-save" style="background: #22c55e; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">Ayarları Kaydet</button>
      </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Proje checkboxlarını dinamik ekle
  const projectsContainer = modal.querySelector('#m-projects');
  allProjects.forEach(proj => {
      const isChecked = currentAccess[proj.id] === true;
      const lbl = createEl("label");
      lbl.style.cssText = "display: flex; align-items: center; gap: 8px; font-size: 0.85em; color: #e4e4e7; cursor: pointer;";
      lbl.innerHTML = `<input type="checkbox" value="${proj.id}" class="m-proj-checkbox" ${isChecked ? 'checked' : ''}> ${proj.name}`;
      projectsContainer.appendChild(lbl);
  });

  // Modal Kapatma İşlemi
  const closeModal = () => overlay.remove();
  modal.querySelector('#close-modal-btn').onclick = closeModal;
  modal.querySelector('#btn-cancel').onclick = closeModal;

  // Şifre Sıfırlama Gönderme
  modal.querySelector('#btn-reset-pw').onclick = async (e) => {
      const btn = e.target;
      btn.disabled = true;
      btn.innerText = "Gönderiliyor...";
      try {
          const userEmail = profile.email || user.email;
          if (!userEmail) throw new Error("Kullanıcının geçerli bir mail adresi bulunamadı.");
          await sendPasswordResetEmail(auth, userEmail);
          alert(`${userEmail} adresine şifre sıfırlama bağlantısı gönderildi.`);
          btn.innerText = "Gönderildi ✅";
          btn.style.background = "#22c55e";
      } catch (err) {
          console.error(err);
          alert("Mail gönderilemedi: " + err.message);
          btn.disabled = false;
          btn.innerText = "Tekrar Dene";
      }
  };

  // Verileri Kaydetme İşlemi (Firestore Update)
  modal.querySelector('#btn-save').onclick = async (e) => {
      const btn = e.target;
      btn.disabled = true;
      btn.innerText = "Kaydediliyor...";

      try {
          // Checkboxlardan proje izinlerini topla
          const newProjectAccess = {};
          modal.querySelectorAll('.m-proj-checkbox').forEach(cb => {
              if (cb.checked) newProjectAccess[cb.value] = true;
          });

          // Güncellenecek veriyi hazırla (Nokta notasyonu ile sadece ilgili alanları ez)
          const updates = {
              "profile.fullName": modal.querySelector('#m-name').value.trim(),
              "profile.companyName": modal.querySelector('#m-company').value.trim(),
              "profile.photoURL": modal.querySelector('#m-photo').value.trim(),
              "role.status": modal.querySelector('#m-status').value,
              "role.type": modal.querySelector('#m-role').value,
              "projectAccess": newProjectAccess
          };

          // Firestore'u Güncelle
          const userRef = doc(db, "users", user.id);
          await updateDoc(userRef, updates);

          closeModal();
          // Sayfayı yenileyerek yeni verilerin ekrana yansımasını sağla
          window.location.reload();

      } catch (error) {
          console.error("Güncelleme hatası:", error);
          alert("Ayarlar kaydedilirken hata oluştu!");
          btn.disabled = false;
          btn.innerText = "Ayarları Kaydet";
      }
  };
}

// ----------------------------------------------------
// SATIR OLUŞTURMA (CREATE ROW)
// ----------------------------------------------------
function createRow({ user, projects, session }) {
  const tr = createEl("tr", { className: "admin-row" });

  const profile = user.profile || {};

  const tdUser = createEl("td", { className: "admin-user-cell" });
  tdUser.style.verticalAlign = "middle";
  tdUser.style.textAlign = "center"; 
  
  const fullName = profile.fullName || user.fullName || user.name || (profile.email ? profile.email.split("@")[0] : "İsimsiz Kullanıcı");
  const email = profile.email || user.email || "Email belirtilmemiş";
  
  const nameLine = createEl("div", { className: "admin-user-name" });
  nameLine.innerHTML = `<strong>${fullName}</strong> <br><span style="font-size: 0.75em; opacity: 0.5; font-weight: normal;">${user.id}</span>`;
  
  const emailLine = createEl("div", { className: "admin-user-meta", text: email });
  emailLine.style.color = "#a1a1aa";
  emailLine.style.fontSize = "0.85em";
  emailLine.style.marginTop = "4px";
  
  tdUser.append(nameLine, emailLine);

  const tdCompany = createEl("td", { className: "admin-company-cell" });
  tdCompany.style.verticalAlign = "middle";
  tdCompany.style.textAlign = "center"; 
  const companyName = profile.companyName || "-";
  tdCompany.innerHTML = `<span style="color: #e4e4e7; font-size: 0.9em; font-weight: 500;">${companyName}</span>`;

  const tdRole = createEl("td", { className: "admin-role-cell" });
  tdRole.style.verticalAlign = "middle";
  tdRole.style.textAlign = "center"; 
  
  const roleType = (typeof user.role === 'object' && user.role !== null) ? (user.role.type || 'member') : (user.role || 'member');
  const roleStatus = (typeof user.role === 'object' && user.role !== null) ? (user.role.status || 'active') : (user.status || 'active');

  const capRole = roleType.charAt(0).toUpperCase() + roleType.slice(1);
  const capStatus = roleStatus.charAt(0).toUpperCase() + roleStatus.slice(1);

  tdRole.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
          <span style="background: rgba(255,255,255,0.1); color: #e4e4e7; padding: 4px 10px; border-radius: 6px; font-size: 0.85em; display: inline-block; width: fit-content; font-weight: 500; letter-spacing: 0.5px;">${capRole}</span>
          <span style="background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 4px 10px; border-radius: 6px; font-size: 0.85em; display: inline-block; width: fit-content; font-weight: 500; letter-spacing: 0.5px;">${capStatus}</span>
      </div>
  `;

  const tdProjects = createEl("td", { className: "admin-services-cell" });
  tdProjects.style.verticalAlign = "middle";
  tdProjects.style.textAlign = "center"; 
  
  const wrap = createEl("div");
  wrap.style.display = "flex";
  wrap.style.flexWrap = "wrap";
  wrap.style.gap = "6px";
  wrap.style.justifyContent = "center"; 

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

  const tdImp = createEl("td", { className: "admin-imp-cell" });
  tdImp.style.verticalAlign = "middle";
  tdImp.style.textAlign = "center"; 

  const impBtn = createEl("button", {
    className: "btn btn-sm btn-primary",
    text: "Kullanıcı Olarak Gör"
  });
  impBtn.style.cssText = "padding: 6px 12px; border-radius: 6px; font-weight: 500; border: none; cursor: pointer; background: #6366f1 !important; color: #ffffff !important; opacity: 1 !important; display: inline-block;";
  impBtn.disabled = !session.isAdmin;
  impBtn.addEventListener("click", () => goToUserAs(user.id));
  tdImp.append(impBtn);

  const tdActions = createEl("td", { className: "admin-actions-cell" });
  tdActions.style.verticalAlign = "middle";
  tdActions.style.textAlign = "center"; 
  
  const actionsWrap = createEl("div");
  actionsWrap.style.display = "flex";
  actionsWrap.style.gap = "8px";
  actionsWrap.style.flexWrap = "wrap";
  actionsWrap.style.justifyContent = "center"; 

  // GÜNCELLENDİ: Kullanıcı Ayarları Butonu
  const settingsBtn = createEl("button", { text: "Kullanıcı Ayarları" });
  settingsBtn.style.cssText = "padding: 6px 12px; border-radius: 6px; font-weight: 500; border: none; cursor: pointer; background: #f97316 !important; color: #ffffff !important; opacity: 1 !important; display: inline-block; transition: 0.2s;";
  settingsBtn.onmouseover = () => settingsBtn.style.background = "#ea580c !important";
  settingsBtn.onmouseout = () => settingsBtn.style.background = "#f97316 !important";
  settingsBtn.addEventListener("click", () => {
      openUserSettingsModal(user, projects);
  });

  const deleteBtn = createEl("button", { text: "Kullanıcıyı Kaldır" });
  deleteBtn.style.cssText = "padding: 6px 12px; border-radius: 6px; font-weight: 500; border: none; cursor: pointer; background: #ef4444 !important; color: #ffffff !important; opacity: 1 !important; display: inline-block; transition: 0.2s;";
  deleteBtn.onmouseover = () => deleteBtn.style.background = "#dc2626 !important";
  deleteBtn.onmouseout = () => deleteBtn.style.background = "#ef4444 !important";
  
  deleteBtn.addEventListener("click", async () => {
    if (confirm(`DİKKAT: ${email} kullanıcısını veritabanından kalıcı olarak silmek istediğinize emin misiniz?`)) {
        try {
            await deleteDoc(doc(db, "users", user.id));
            tr.remove(); 
        } catch (error) {
            console.error("Silme hatası:", error);
            alert("Kullanıcı silinirken bir hata oluştu!");
        }
    }
  });

  actionsWrap.append(settingsBtn, deleteBtn);
  tdActions.append(actionsWrap);

  tr.append(tdUser, tdCompany, tdRole, tdProjects, tdImp, tdActions);
  return tr;
}

async function init() {
  try {
    const session = await requireAuth();
    if (!session) return;

    const logoutBtn = qs("#logout-btn") || qs("#logout") || qs("[data-action='logout']");
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

    const table = tbody.parentElement;
    if (table) {
        let thead = table.querySelector("thead");
        if (!thead) {
            thead = createEl("thead");
            table.prepend(thead);
        }
        thead.innerHTML = `
            <tr>
                <th style="text-align: center; padding: 12px 10px; color: #9ca3af; font-size: 0.75rem; letter-spacing: 0.5px;">KULLANICI BİLGİLERİ</th>
                <th style="text-align: center; padding: 12px 10px; color: #9ca3af; font-size: 0.75rem; letter-spacing: 0.5px;">ŞİRKET</th>
                <th style="text-align: center; padding: 12px 10px; color: #9ca3af; font-size: 0.75rem; letter-spacing: 0.5px;">ROL & DURUM</th>
                <th style="text-align: center; padding: 12px 10px; color: #9ca3af; font-size: 0.75rem; letter-spacing: 0.5px;">PROJE ERİŞİMLERİ</th>
                <th style="text-align: center; padding: 12px 10px; color: #9ca3af; font-size: 0.75rem; letter-spacing: 0.5px;">IMPERSONATE</th>
                <th style="text-align: center; padding: 12px 10px; color: #9ca3af; font-size: 0.75rem; letter-spacing: 0.5px;">AKSİYONLAR</th>
            </tr>
        `;
    }

    const allProjects = await getProjects();
    const activeProjects = (allProjects || []).filter(p => p && p.status === "active");

    const users = await fetchUsers();
    tbody.innerHTML = "";

    for (const user of users) {
      const row = createRow({ user, projects: activeProjects, session });
      tbody.append(row);
    }

    // Gereksiz genel "Kaydet" butonu ve mantığı kaldırıldı, her şey modaldan anlık kaydediliyor.
    const oldSaveBtn = qs(".admin-save-btn") || qs("#save-btn") || qs("#save-access-btn");
    if(oldSaveBtn) oldSaveBtn.style.display = "none";

  } catch (e) {
    console.error(e);
    setStatus("Admin sayfası başlatılamadı: " + (e?.message || "Bilinmeyen hata"), "error");
  }
}

init();
