import { logout, requireAuth } from "../lib/auth.js";
import { db } from "../lib/firebase.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { createEl, qs } from "../utils/dom.js";

// Global Yapılandırma Değişkeni
let emailConfig = null;

/**
 * Firestore üzerinden EmailJS ve diğer sistem ayarlarını çeker.
 */
async function fetchSystemConfigs() {
    try {
        const configSnap = await getDoc(doc(db, "configs", "email_service"));
        if (configSnap.exists()) {
            emailConfig = configSnap.data();
            // EmailJS kütüphanesini anahtarla başlat
            if (window.emailjs) {
                emailjs.init(emailConfig.publicKey);
            }
        } else {
            console.warn("E-posta yapılandırması Firestore'da bulunamadı!");
        }
    } catch (err) {
        console.error("Sistem ayarları yüklenirken hata oluştu:", err);
    }
}

function resolveProjectUrl(path) {
    if (!path) return "#";
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const impUid = localStorage.getItem("teknoify_impersonate_uid");
    if (!impUid) return normalizedPath;
    return `${normalizedPath}${normalizedPath.includes('?') ? '&' : '?'}imp_uid=${impUid}`;
}

// YENİ EKLENEN: Admin Impersonation Test Modu Uyarı Bantı
function renderImpersonationBanner() {
    const impUid = localStorage.getItem("teknoify_impersonate_uid");
    if (!impUid) return;

    if (qs("#imp-banner-wrap")) return;

    const banner = createEl("div", { id: "imp-banner-wrap", className: "impersonation-warning" });
    banner.style.cssText = "background: #f59e0b; color: #fff; padding: 10px; text-align: center; font-weight: 500; font-size: 0.9rem; z-index: 9999; position: relative; display: flex; justify-content: center; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.5);";
    
    banner.innerHTML = `
        <span><i class="fa-solid fa-user-secret"></i> Şu an farklı bir kullanıcı görünümündesiniz.</span>
        <button id="btn-end-imp" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: 0.2s;">Geri Dön</button>
    `;
    
    document.body.prepend(banner);

    document.getElementById("btn-end-imp").onclick = () => {
        localStorage.removeItem("teknoify_impersonate_uid");
        window.location.href = "/dashboard/admin";
    };
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

    // Chat Açma Butonu (Trigger)
    const chatTrigger = createEl("div", { id: "chat-trigger", className: "chat-trigger-btn" });
    chatTrigger.innerHTML = `<i class="fa-solid fa-comment-dots"></i>`;
    document.body.append(chatTrigger);

    // Chat Penceresi
    chatWrap = createEl("div", { id: "tk-ai-chat", className: "ai-chat-window" });
    const userName = session.profile?.fullName || session.name || "Kullanıcı";
    chatWrap.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-info">
                <div class="chat-status-dot"></div>
                <span>Teknoify AI Assistant</span>
            </div>
            <button class="chat-close-btn" id="close-chat-window">×</button>
        </div>
        <div class="chat-body" id="chat-messages">
            <div class="ai-msg">Merhaba ${userName.split(' ')[0]}, size nasıl yardımcı olabilirim?</div>
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
            window.sendChatMessage(val, session);
            input.value = "";
        }
    };

    input.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });
    sendBtn.onclick = handleSend;

    qs("#chat-btn-projects").onclick = () => window.sendChatMessage("Aktif projelerimi listele", session);
    qs("#chat-btn-support").onclick = () => window.sendChatMessage("Destek ekibiyle görüşmek istiyorum", session);
    qs("#chat-btn-reports").onclick = () => window.sendChatMessage("Raporlarımı analiz et", session);
}

window.sendChatMessage = (msg, session) => {
    const chatBody = qs("#chat-messages");
    if (!chatBody) return;

    const userDiv = createEl("div", { className: "user-msg", text: msg });
    chatBody.append(userDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    setTimeout(async () => {
        if (msg.toLowerCase().includes("destek")) {
            const aiDiv = createEl("div", { 
                className: "ai-msg", 
                text: "Destek talebinizi ilgili birimlere ilettik. Destek talebinizi bu form içerisinde belirtirseniz size çok daha hızlı destek olabiliriz:" 
            });
            chatBody.append(aiDiv);

            const formDiv = createEl("div", { className: "chat-support-form" });
            formDiv.innerHTML = `
                <input type="text" id="support-subject" placeholder="Konu (Örn: Veri Hatası)">
                <textarea id="support-content" placeholder="Sorununuzu detaylandırın..."></textarea>
                <div class="file-upload-wrap">
                    <label for="support-file"><i class="fa-solid fa-paperclip"></i> Dosya Ekle (Görsel/PDF)</label>
                    <input type="file" id="support-file" hidden onchange="this.previousElementSibling.innerText = this.files[0].name">
                </div>
                <button id="btn-submit-support" class="btn-glow">Talebi Gönder</button>
            `;
            chatBody.append(formDiv);

            qs("#btn-submit-support").onclick = async () => {
                if (!emailConfig) return alert("E-posta servisi henüz hazır değil.");
                
                const sub = qs("#support-subject").value;
                const con = qs("#support-content").value;
                if(!sub || !con) return alert("Lütfen gerekli alanları doldurun.");
                
                qs("#btn-submit-support").innerText = "Gönderiliyor...";
                qs("#btn-submit-support").disabled = true;

                try {
                    // 1. MAİL: ADMİNE (SANA) GİDEN
                    await emailjs.send(emailConfig.serviceId, emailConfig.supportTemplateId, {
                        subject: sub,
                        message: con,
                        from_name: session.profile?.fullName || session.name,
                        reply_to: session.profile?.email || session.email
                    });

                    // 2. MAİL: KULLANICIYA GİDEN OTOMATİK YANIT
                    await emailjs.send(emailConfig.serviceId, emailConfig.autoReplyTemplateId, {
                        from_name: session.profile?.fullName || session.name,
                        message: con,
                        reply_to: session.profile?.email || session.email
                    });

                    formDiv.innerHTML = `<p style="color:#22c55e; font-size:0.85rem; text-align:center;"><i class="fa-solid fa-check-circle"></i> Talebiniz alındı. Tarafınıza onay maili gönderildi.</p>`;
                } catch (err) {
                    console.error("Mail gönderme hatası:", err);
                    alert("Mail gönderilemedi, lütfen tekrar deneyin.");
                    qs("#btn-submit-support").innerText = "Talebi Gönder";
                    qs("#btn-submit-support").disabled = false;
                }
                chatBody.scrollTop = chatBody.scrollHeight;
            };
        } else {
            let aiResp = "İsteğinizi aldım. Yapay zeka modelimiz şu an analiz ediyor.";
            if (msg.toLowerCase().includes("proje")) aiResp = "Hesabınızda erişebileceğiniz aktif projeler ana ekranınızda listelenmiştir.";
            
            const aiDiv = createEl("div", { className: "ai-msg", text: aiResp });
            chatBody.append(aiDiv);
        }
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

// --- ANA BAŞLATMA FONKSİYONU ---
async function init() {
    renderImpersonationBanner();

    const session = await requireAuth();
    if (!session) return;

    await fetchSystemConfigs();

    // Kullanıcı adını ekrana yazdır (profile objesini dikkate alarak)
    if (qs("#session-user-name")) {
        const userName = session.profile?.fullName || session.fullName || session.name || session.email?.split('@')[0] || "Kullanıcı";
        qs("#session-user-name").textContent = userName;
    }
    
    // Admin Linkinin Görünürlüğü
    const isAdminUser = session.role?.type === "admin" || session.isAdmin === true || session.profile?.role?.type === "admin";
    if (qs("#admin-link")) {
        qs("#admin-link").style.display = isAdminUser ? "block" : "none";
    }
    
    if (qs("#logout-btn")) {
        qs("#logout-btn").addEventListener("click", logout);
    }

    updateSupportStatus(session);
    initAIChat(session);

    // GÜNCELLENEN KISIM: Projeleri Çekme ve Yetki Kontrolü
    try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        const activeProjects = [];
        let latestGlobalUpdate = "Bugün";

        querySnapshot.forEach((doc) => {
            const projectId = doc.id;
            const data = doc.data();
            
            if (data.config?.isActive === false) return;

            // ERİŞİM KONTROL MANTIĞI: projectAccess'i çek ve kontrol et (Esnek kontrol eklendi)
            const accessObj = session.projectAccess || session.profile?.projectAccess || {};
            const hasAccess = isAdminUser || accessObj[projectId] === true || accessObj[projectId] === "true";

            // --- KESİN RÖNTGEN: KONSOLA VERİ YAZDIRMA ---
            // Sorunu F12 Konsolunda kendi gözlerinle görmeni sağlayacak kod:
            if(projectId === "YnONl3KsXap06gc3W45D") {
                console.log("=== HATA AYIKLAMA KONTROLÜ ===");
                console.log("Giriş Yapan UID:", session.uid);
                console.log("Cepteki İzinler (projectAccess):", accessObj);
                console.log("İzin Verildi mi?:", hasAccess);
                console.log("==============================");
            }
            // ---------------------------------------------

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
        console.error("Dashboard projeleri başlatılırken hata oluştu:", error);
    }
}

init();
