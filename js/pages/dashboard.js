import { logout, requireAuth } from "../lib/auth.js";
import { db } from "../lib/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { createEl, qs } from "../utils/dom.js";

function resolveProjectUrl(path, projectId = "") {
  if (!path) return "#";
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedPath;
}

function updateSupportStatus() {
  const statusEl = qs("#dashboard-stats .stat-box:nth-child(3) .stat-value");
  const boxEl = qs("#dashboard-stats .stat-box:nth-child(3)");
  if (!statusEl) return;

  const now = new Date();
  const hours = now.getHours();
  const isWorkHours = hours >= 9 && hours < 18;
  
  statusEl.textContent = isWorkHours ? "Aktif" : "Pasif";
  statusEl.style.color = isWorkHours ? "#22c55e" : "#ef4444";
  boxEl.style.cursor = "pointer";
  
  if (!boxEl.onclick) {
    boxEl.onclick = () => openSupportChat();
  }
}

function openSupportChat() {
    let chatWrap = qs("#tk-ai-chat");
    if (!chatWrap) {
        chatWrap = createEl("div", { id: "tk-ai-chat", className: "ai-chat-window" });
        chatWrap.innerHTML = `
            <div class="chat-header">
                <span>Teknoify AI Destek</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="chat-body" id="chat-messages">
                <p class="ai-msg">Selam! Ben Teknoify AI. Size nasıl yardımcı olabilirim?</p>
            </div>
            <div class="chat-suggestions">
                <button onclick="sendQuickMsg('Projem neden yüklenmiyor?')">Proje Yükleme Sorunu</button>
                <button onclick="sendQuickMsg('Yeni veri ne zaman gelir?')">Veri Güncelleme</button>
            </div>
            <div class="chat-input-area">
                <input type="text" placeholder="Mesajınızı yazın..." id="chat-input">
                <button id="send-chat">Gönder</button>
            </div>
        `;
        document.body.append(chatWrap);
    }
}

window.sendQuickMsg = (msg) => {
    const body = qs("#chat-messages");
    body.innerHTML += `<p class="user-msg">${msg}</p>`;
    setTimeout(() => {
        body.innerHTML += `<p class="ai-msg">Bu konuda size yardımcı olmamı ister misiniz? Uzman ekibimize bildirim gönderiyorum.</p>`;
        body.scrollTop = body.scrollHeight;
    }, 1000);
};

function renderAdvancedProjects(projects) {
  const list = qs("#project-list");
  if (!list) return;
  list.innerHTML = "";

  projects.forEach((project) => {
    const card = createEl("div", { className: "adv-project-card" });
    const imgContent = project.imageURL 
        ? `<img src="${project.imageURL}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`
        : `<i class="${project.icon || 'fa-solid fa-earth-americas'}"></i>`;

    card.innerHTML = `
      <div class="adv-project-img-wrapper">${imgContent}</div>
      <div class="adv-project-content">
        <div class="adv-project-header">
          <h3>${project.name}</h3>
          <div class="adv-status-badge">Aktif</div>
        </div>
        <p class="adv-project-desc">${project.description}</p>
        <div class="adv-tags">
          <span class="adv-tag purple">Analytics</span>
          <span class="adv-tag blue">Geo Data</span>
          <span class="adv-tag teal">Dashboard</span>
        </div>
        <div class="adv-project-footer">
          <div class="adv-date"><i class="fa-solid fa-calendar-day"></i> Son güncelleme: ${project.lastUpdate}</div>
          <div class="adv-actions">
            <a href="${project.url}" class="btn-glow">Projeyi Başlat</a>
            <button class="btn-outline-dark">Detaylar</button>
          </div>
        </div>
      </div>
    `;
    list.append(card);
  });
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  qs("#session-user-name").textContent = session.name;
  updateSupportStatus();

  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const activeProjects = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const projectId = doc.id;
      if (data.config?.isActive !== false && (session.isAdmin || session.projectAccess?.[projectId])) {
        activeProjects.push({
          id: projectId,
          name: data.details?.name || projectId,
          description: data.details?.description || "",
          icon: data.details?.icon,
          imageURL: data.details?.imageURL, // Firestore'a bu alanı eklemelisin
          url: resolveProjectUrl(data.config?.folderPath + "/" + data.config?.entryPoint),
          lastUpdate: data.audit?.lastUpdate || "Bugün"
        });
      }
    });

    qs("#stat-active-projects").textContent = activeProjects.length;
    qs("#stat-tools").textContent = activeProjects.length;
    renderAdvancedProjects(activeProjects);
  } catch (e) { console.error(e); }
}

init();
