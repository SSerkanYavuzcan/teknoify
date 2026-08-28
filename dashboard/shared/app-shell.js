import { requireAuth } from "/js/lib/auth.js";
import { db } from "/js/lib/firebase.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const page = document.body.dataset.page;
const title = document.body.dataset.title;
const descriptions = {
  agents: "Kullanabildiğiniz yapay zekâ ajanlarına tek noktadan ulaşın.", tools: "Teknoify araçlarını ve veri servislerini keşfedin.", models: "Kuruluşunuza özel model çalışmalarını yönetin.", projects: "Erişiminiz olan aktif proje ve servisleri görüntüleyin.", history: "Uygulamadaki işlem geçmişinizi takip edin.", api: "API erişimlerinizi güvenli biçimde yönetin.", docs: "Geliştirici kaynaklarına ve entegrasyon rehberlerine ulaşın.", webhooks: "Webhook entegrasyonlarınızı yönetin.", usage: "Abonelik ve kullanım bilgilerinizi görüntüleyin.", invoices: "Faturalandırma kayıtlarınızı görüntüleyin.", team: "Kuruluşunuzun takım yönetimi alanı.", profile: "Profil ve hesap güvenliği ayarlarınızı yönetin.", help: "Teknoify ürünleri için yardım kaynaklarına ulaşın."
};

function setIdentity(session) {
  const name = session.name || session.displayName || session.email || "Teknoify Kullanıcısı";
  window.USER_SESSION = { ...session, name, displayName: name };
  window.TK_MEMBER_TOPBAR?.setIdentity({ name, photoURL: session.photoURL || "" });
  window.TK_MEMBER_TOPBAR?.setAdminAccess({ visible: Boolean(session.isAdmin), href: "/dashboard/admin.html" });
  window.TK_RENDER_SIDEBAR?.();
}

function featureCard(name, href, icon = "fas fa-arrow-up-right-from-square") {
  const a = document.createElement("a"); a.className = "app-shell-feature"; a.href = href;
  a.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${name}</span><i class="fas fa-chevron-right" aria-hidden="true"></i>`;
  return a;
}

async function renderFeatures(session) {
  const list = document.getElementById("app-shell-features");
  if (!list || !["agents", "tools", "projects"].includes(page)) return;
  try {
    const userSnap = await getDoc(doc(db, "users", session.uid));
    const data = userSnap.exists() ? userSnap.data() : {};
    const accessKey = page === "agents" ? "agentAccess" : "projectAccess";
    const ids = Object.keys(data[accessKey] || {}).filter(id => data[accessKey][id] === true);
    const source = page === "agents" ? "agents" : "projects";
    const records = [];
    if (session.isAdmin) (await getDocs(collection(db, source))).forEach(s => records.push({ id: s.id, ...s.data() }));
    else (await Promise.all(ids.map(id => getDoc(doc(db, source, id))))).forEach(s => { if (s.exists()) records.push({ id: s.id, ...s.data() }); });
    if (page === "agents" && (session.isAdmin || ids.includes("product-discover"))) list.append(featureCard("Product Discover", "/dashboard/agents/product-discover/index.html", "fas fa-magnifying-glass-chart"));
    records.filter(item => item.config?.isActive !== false).forEach(item => {
      const path = `/${item.config?.folderPath || ""}/${item.config?.entryPoint || "index.html"}`.replace(/\/+/g, "/");
      if (!list.querySelector(`[href="${path}"]`)) list.append(featureCard(item.details?.name || item.id, path, item.details?.icon || "fas fa-cube"));
    });
    if (page === "tools") {
      list.append(featureCard("Web Scraping", "/dashboard/web-scraping/quickcommerce/index.html", "fas fa-spider"));
      list.append(featureCard("Geo Intelligence", "/dashboard/geo-intelligence/index.html", "fas fa-map-location-dot"));
    }
    if (page === "projects") list.append(featureCard("Yatırım", "/dashboard/services/investment/index.html", "fas fa-chart-line"));
    if (list.children.length) document.getElementById("app-shell-empty").hidden = true;
  } catch (error) { console.warn("Uygulama bağlantıları yüklenemedi:", error); }
}

const session = await requireAuth(page === "team" ? { allowedRoles: ["admin"] } : {});
if (session) { setIdentity(session); await renderFeatures(session); }
document.getElementById("app-shell-title").textContent = title;
document.getElementById("app-shell-description").textContent = descriptions[page] || "Bu alan yakında kullanıma açılacak.";
