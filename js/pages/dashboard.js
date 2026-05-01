import { logout, requireAuth } from "../lib/auth.js";
import { db } from "../lib/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { createEl, qs } from "../utils/dom.js";

function resolveProjectUrl(path) {
  if (!path) return "#";
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const impUid = localStorage.getItem("teknoify_impersonate_uid");
  if (!impUid) return normalizedPath;
  return `${normalizedPath}${normalizedPath.includes('?') ? '&' : '?'}imp_uid=${impUid}`;
}

function updateSupportStatus(session) {
  const statusEl = qs("#dashboard-stats .stat-box:nth-child(3) .stat-value");
  const boxEl = qs("#dashboard-stats .stat-box:nth-child(3)");
  if (!statusEl || !boxEl) return;

  const now = new Date();
  const hours = now.getHours();
  const isWorkHours = hours >= 9 && hours < 18;
  
  statusEl.textContent = isWorkHours ? "Aktif" : "Pasif";
  statusEl.style.color = isWorkHours ? "#22c55e" : "#ef4444";
  
  boxEl.style.cursor = "pointer";
  boxEl.onclick = () => {
      const chat = qs("#tk-ai-chat");
      if (chat) chat.classList.add("active");
  };
}

function initAIChat(session) {
    let chatWrap = qs("#tk-ai-chat");
    if (chatWrap) return;

    const chatTrigger = createEl("div", { id: "chat-trigger", className: "chat-trigger-btn" });
    chatTrigger.innerHTML = `<i class="fa-solid fa-comment-dots"></i>`;
    document.body.append(chatTrigger);

    chatWrap = createEl("div", { id: "tk-ai-chat", className: "ai-chat-window" });
    chatWrap.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-info">
                <div class="chat-status-dot"></div>
                <span>Teknoify AI Assistant</span>
            </div>
            <button class="chat-close-btn" id="close-chat-window">×</button>
        </div>
        <div class="chat-body" id="chat-messages">
            <div class="ai-msg">Merhaba ${session.name.split(' ')[0]}, size nasıl yardımcı olabilirim?</div>
        </div>
        <div class="chat-footer">
            <div class="chat-quick-actions">
                <button id="chat-btn-projects">📁 Projelerim</button>
                <button id="chat-btn-support">❓ Destek</button>
                <button id="chat-btn-reports">📊 Raporlar</button>
            </div>
            <div class="chat-input-area">
                <input type="text" placeholder="Mesajınızı yazın..." id="chat-input">
                <button id="btn-send-message"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    document.body.append(chatWrap);

    chatTrigger.onclick = () => chatWrap.classList.add("active");
    qs("#close-chat-window").onclick = () => chatWrap.classList.remove("active");

    const input = qs("#chat-input");
    const sendBtn = qs("#btn-send-message");

    const handleSend = () => {
        const val = input.value;
        if (val.trim()) {
            window.sendChatMessage(val);
            input.value = "";
        }
    };

    input.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });
    sendBtn.onclick = handleSend;

    qs("#chat-btn-projects").onclick = () => window.sendChatMessage("Aktif projelerimi listele");
    qs("#chat-btn-support").onclick = () => window.sendChatMessage("Destek ekibiyle görüşmek istiyorum");
    qs("#chat-btn-reports").onclick = () => window.sendChatMessage("Raporlarımı analiz et");
}

window.sendChatMessage = (msg) => {
    const chatBody = qs("#chat-messages");
    if (!chatBody) return;

    const userDiv = createEl("div", { className: "user-msg", text: msg });
    chatBody.append(userDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    setTimeout(() => {
        let aiResp = "İsteğinizi aldım. Yapay zeka modelimiz şu an isteğinizi analiz ediyor.";
        if (msg.toLowerCase().includes("proje")) aiResp = "Hesabınızda 1 adet aktif proje (Geo Intelligence) tanımlı görünüyor.";
        if (msg.toLowerCase().includes("destek")) aiResp = "Destek talebiniz sisteme iletildi. En kısa sürede size dönüş yapacağız.";
        
        const aiDiv = createEl("div", { className: "ai-msg", text: aiResp });
        chatBody.append(aiDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 800);
};

function renderAdvancedProjects(projects) {
  const list = qs("#project-list");
  const empty = qs("#project-empty");
  if (!list || !empty) return;

  list.innerHTML = "";
  if (!projects.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  projects.forEach((project) => {
    const card = createEl("div", { className: "adv-project-card" });
    const imgContent = project.imageURL 
        ? `<img src="${project.imageURL}" alt="${project.name}">`
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
            <button class="btn-outline-dark">Detaylar <i class="fa-solid fa-chevron-right"></i></button>
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

  if (qs("#session-user-name")) qs("#session-user-name").textContent = session.name;
  if (qs("#admin-link")) qs("#admin-link").style.display = (session.isAdmin || session.role?.type === "admin") ? "block" : "none";
  if (qs("#logout-btn")) qs("#logout-btn").addEventListener("click", logout);

  updateSupportStatus(session);
  initAIChat(session);

  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const activeProjects = [];
    let latestGlobalUpdate = "Bugün";

    querySnapshot.forEach((doc) => {
      const projectId = doc.id;
      const data = doc.data();
      if (data.config?.isActive === false) return;

      const hasAccess = session.isAdmin || (session.projectAccess && session.projectAccess[projectId] === true);
      if (hasAccess) {
        const folderPath = data.config?.folderPath || `dashboard/${projectId}`;
        const entryPoint = data.config?.entryPoint || "index.html";
        const projectUpdate = data.audit?.lastUpdate || "Bugün";

        activeProjects.push({
          id: projectId,
          name: data.details?.name || projectId,
          description: data.details?.description || "",
          icon: data.details?.icon,
          imageURL: data.details?.imageURL,
          url: resolveProjectUrl(`${folderPath}/${entryPoint}`),
          lastUpdate: projectUpdate
        });
        latestGlobalUpdate = projectUpdate;
      }
    });

    if (qs("#stat-active-projects")) qs("#stat-active-projects").textContent = activeProjects.length;
    if (qs("#stat-tools")) qs("#stat-tools").textContent = activeProjects.length;
    const lastUpdateEl = qs("#dashboard-stats .stat-box:last-child .stat-value");
    if (lastUpdateEl) lastUpdateEl.textContent = latestGlobalUpdate;

    renderAdvancedProjects(activeProjects);
  } catch (error) {
    console.error("Dashboard hatası:", error);
  }
}

init();
