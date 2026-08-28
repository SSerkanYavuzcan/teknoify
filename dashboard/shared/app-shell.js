import { requireAuth } from "/js/lib/auth.js";
import "./profile-manager.js";
import { db } from "/js/lib/firebase.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const page = document.body.dataset.page;
const state = { records: [], query: "", category: "tumu" };
const copy = {
  overview: ["Genel Bakış", "Hesabınızdaki erişimleri ve kullanılabilir çalışma alanlarını tek yerde izleyin."],
  agents: ["Ajan Kütüphanesi", "Yetkinliklerinize uygun, erişebildiğiniz yapay zekâ ajanlarını keşfedin."],
  tools: ["Araçlar & Servisler", "Veri toplama, analiz ve konum servislerine güvenle ulaşın."],
  models: ["Özel Modellerim", "Kaydedilmiş istemleri, bilgi kaynaklarını ve özel modelleri ayrı ayrı yönetin."],
  projects: ["Aktif Projeler", "Erişiminiz olan proje ve servisleri hızlıca bulun."],
  history: ["İşlem Geçmişi", "Desteklenen servislerdeki kullanıcı işlemleri burada görüntülenir."]
};
const builtIns = {
  tools: [
    { id: "web-scraping", name: "Web Scraping", description: "Web kaynaklarından yapılandırılmış veri toplama araçlarını açın.", category: "Veri Toplama", icon: "fas fa-spider", href: "/dashboard/web-scraping/quickcommerce/index.html" },
    { id: "geo-intelligence", name: "Geo Intelligence", description: "Konum verilerini harita üzerinde inceleyin ve analiz edin.", category: "Konum Analizi", icon: "fas fa-map-location-dot", href: "/dashboard/geo-intelligence/index.html" },
    { id: "investment", name: "Yatırım", description: "Yatırım analizi ve finansal hesaplama çalışma alanını açın.", category: "Finansal Analiz", icon: "fas fa-chart-line", href: "/dashboard/services/investment/index.html" }
  ]
};

function withImpersonation(path) {
  const url = new URL(path, location.origin);
  if (url.origin !== location.origin || !url.pathname.startsWith("/dashboard/")) return "";
  const uid = localStorage.getItem("teknoify_impersonate_uid");
  if (uid) url.searchParams.set("imp_uid", uid);
  return `${url.pathname}${url.search}`;
}
function normalizeRecord(snap, type) {
  const value = snap.data ? snap.data() : snap;
  const details = value.details || {};
  const config = value.config || {};
  const rawPath = `/${config.folderPath || ""}/${config.entryPoint || "index.html"}`.replace(/\/+/g, "/");
  const rawIcon = details.icon || value.icon || "";
  const icon = /(^|\s)fa[srlb]?\s+fa-[\w-]+/.test(rawIcon)
    ? rawIcon
    : /^fa-[\w-]+$/.test(rawIcon) ? `fas ${rawIcon}` : type === "agents" ? "fas fa-robot" : "fas fa-folder-open";
  return { id: snap.id || value.id, name: details.name || value.name || snap.id, description: details.description || value.description || "", category: details.category || value.category || (type === "agents" ? "Ajan" : "Servis"), tags: Array.isArray(details.capabilities) ? details.capabilities : Array.isArray(value.tags) ? value.tags : [], icon, href: withImpersonation(rawPath), status: config.isActive === false ? "Kullanılamıyor" : "Erişilebilir" };
}
function setIdentity(session) {
  const name = session.name || session.displayName || session.email || "Teknoify Kullanıcısı";
  window.USER_SESSION = { ...session, name, displayName: name };
  window.TK_MEMBER_TOPBAR?.setIdentity({ name, photoURL: session.photoURL || "" });
  window.TK_MEMBER_TOPBAR?.setAdminAccess({ visible: Boolean(session.isAdmin), href: "/dashboard/admin.html" });
  window.TK_RENDER_SIDEBAR?.();
  const profileTrigger = document.getElementById("tk-member-profile-trigger");
  if (profileTrigger && session.impersonating) {
    profileTrigger.disabled = true;
    profileTrigger.title = "Kullanıcı görünümünde profil değiştirilemez";
    profileTrigger.setAttribute("aria-label", "Kullanıcı görünümünde profil değiştirilemez");
  }
}
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function showState(kind, title, detail, action) {
  const root = document.getElementById("phase2-results"); root.replaceChildren();
  const box = element("div", `phase2-state phase2-state--${kind}`); box.setAttribute("role", kind === "error" ? "alert" : "status");
  const icon = element("i", kind === "error" ? "fas fa-triangle-exclamation" : "fas fa-folder-open"); icon.setAttribute("aria-hidden", "true");
  box.append(icon, element("strong", "", title), element("p", "", detail));
  if (action) { const button = element("button", "phase2-button phase2-button--secondary", "Filtreleri temizle"); button.type = "button"; button.addEventListener("click", resetFilters); box.append(button); }
  root.append(box);
}
function card(record, label) {
  const article = element("article", "catalog-card");
  const head = element("div", "catalog-card__head"); const icon = element("span", "catalog-card__icon"); icon.append(element("i", record.icon));
  const identity = element("div"); identity.append(element("h2", "", record.name), element("span", "phase2-badge", record.status || "Erişilebilir")); head.append(icon, identity);
  article.append(head);
  if (record.description) article.append(element("p", "catalog-card__description", record.description));
  const tags = element("div", "phase2-tags"); [record.category, ...record.tags].filter(Boolean).slice(0, 4).forEach(tag => tags.append(element("span", "phase2-tag", tag))); article.append(tags);
  if (record.href) { const link = element("a", "phase2-button phase2-button--secondary", label); link.href = record.href; link.append(element("i", "fas fa-arrow-right")); article.append(link); }
  return article;
}
function matches(record) { const term = state.query.toLocaleLowerCase("tr-TR"); return (!term || `${record.name} ${record.description} ${record.tags.join(" ")}`.toLocaleLowerCase("tr-TR").includes(term)) && (state.category === "tumu" || record.category === state.category); }
function renderCatalog() {
  const filtered = state.records.filter(matches); document.getElementById("result-count").textContent = `${filtered.length} sonuç`;
  if (!state.records.length) return showState("empty", "Erişilebilir kayıt bulunamadı", "Hesabınıza bir erişim tanımlandığında kayıtlar burada görünecek.");
  if (!filtered.length) return showState("empty", "Aramanızla eşleşen sonuç yok", "Arama ifadenizi veya kategori seçiminizi değiştirin.", true);
  const root = document.getElementById("phase2-results"); root.replaceChildren(); const grid = element("div", `catalog-grid${filtered.length === 1 ? " catalog-grid--single" : ""}`);
  filtered.forEach(item => grid.append(card(item, page === "agents" ? "Ajanı Aç" : "Aracı Aç"))); root.append(grid);
}
function resetFilters() { state.query = ""; state.category = "tumu"; document.getElementById("catalog-search").value = ""; document.getElementById("catalog-category").value = "tumu"; renderCatalog(); }
function setupFilters() {
  const select = document.getElementById("catalog-category"); const categories = [...new Set(state.records.map(r => r.category).filter(Boolean))].sort();
  categories.forEach(value => { const option = element("option", "", value); option.value = value; select.append(option); });
  select.closest("label").hidden = categories.length <= 1;
  document.getElementById("catalog-search").addEventListener("input", event => { state.query = event.target.value.trim(); renderCatalog(); });
  select.addEventListener("change", event => { state.category = event.target.value; renderCatalog(); });
}
async function authorizedRecords(session, userData, type) {
  const source = type === "agents" ? "agents" : "projects";
  // A product-discovery permission grants access to that project surface, not
  // to arbitrary records in the agents collection. Agent discovery must use
  // the dedicated agentAccess map.
  const maps = type === "agents" ? [userData.agentAccess] : [userData.projectAccess];
  const ids = [...new Set(maps.flatMap(map => Object.keys(map || {}).filter(id => map[id] === true)))];
  if (session.isAdmin) { const all = []; (await getDocs(collection(db, source))).forEach(s => all.push(normalizeRecord(s, type))); return all.filter(r => r.status !== "Kullanılamıyor"); }
  const snaps = await Promise.all(ids.map(id => getDoc(doc(db, source, id))));
  const records = snaps.filter(s => s.exists()).map(s => normalizeRecord(s, type));
  if (type === "agents" && ids.includes("product-discover") && !records.some(r => r.id === "product-discover")) records.push({ id: "product-discover", name: "Product Discover", description: "Ürün ve pazar keşfi ajanının mevcut çalışma alanını açın.", category: "Ürün Keşfi", tags: [], icon: "fas fa-magnifying-glass-chart", href: withImpersonation("/dashboard/agents/product-discover/index.html"), status: "Erişilebilir" });
  return records.filter(r => r.status !== "Kullanılamıyor");
}
function renderOverview(userData, projects, agents) {
  const metrics = [
    ["Erişilebilir Projeler", String(projects.length), "Yetki verilen proje ve servisler."], ["Erişilebilir Ajanlar", String(agents.length), "Kütüphanede açabildiğiniz ajanlar."],
    ["API İstekleri", "—", "İstek sayacı bulunmuyor."], ["Token / Kredi Kullanımı", "—", "Kullanım verisi sağlanmıyor."]
  ];
  const root = document.getElementById("metric-grid"); metrics.forEach(([name, value, note]) => { const item = element("article", "metric-card"); item.append(element("span", "", name), element("strong", "", value), element("small", "", note)); root.append(item); });
  const projectRoot = document.getElementById("overview-projects");
  if (!projects.length) projectRoot.append(element("p", "phase2-muted", "Henüz erişilebilir bir proje veya servis yok.")); else projects.slice(0, 4).forEach(item => projectRoot.append(card(item, "Çalışma Alanını Aç")));
  document.getElementById("overview-name").textContent = (window.USER_SESSION.name || "").split(" ")[0];
}
function renderModelsOrHistory() {
  const isModels = page === "models";
  showState("empty", isModels ? "Henüz özel model kaydı yok" : "Görüntülenebilir işlem kaydı yok", isModels ? "Kaydedilmiş istem, bilgi kaynağı veya eğitilmiş model desteği bu hesap için henüz sunulmuyor. Bilgi kaynağı eklemek model eğitimi olarak değerlendirilmez." : "Uygun ve yetkilendirilmiş bir işlem geçmişi kaynağı bulunmadığı için burada hesap verisi gösterilmiyor.");
}
async function init() {
  const session = await requireAuth(); if (!session) return; setIdentity(session);
  if (!copy[page]) {
    const descriptions = { api: "API erişimlerinizi güvenli biçimde yönetin.", docs: "Geliştirici kaynaklarına ve entegrasyon rehberlerine ulaşın.", webhooks: "Webhook entegrasyonlarınızı yönetin.", usage: "Abonelik ve kullanım bilgilerinizi görüntüleyin.", invoices: "Faturalandırma kayıtlarınızı görüntüleyin.", team: "Kuruluşunuzun takım yönetimi alanı.", profile: "Profil ve hesap güvenliği ayarlarınızı yönetin.", help: "Teknoify ürünleri için yardım kaynaklarına ulaşın." };
    const titleNode = document.getElementById("app-shell-title"); const descriptionNode = document.getElementById("app-shell-description");
    if (titleNode) titleNode.textContent = document.body.dataset.title || "Teknoify";
    if (descriptionNode) descriptionNode.textContent = descriptions[page] || "Bu alan yakında kullanıma açılacak.";
    return;
  }
  const [title, description] = copy[page]; document.getElementById("phase2-title").textContent = title; document.getElementById("phase2-description").textContent = description;
  try {
    const userSnap = await getDoc(doc(db, "users", session.uid)); const userData = userSnap.exists() ? userSnap.data() : {};
    if (page === "agents" || page === "tools") { state.records = page === "tools" ? builtIns.tools.map(r => ({ ...r, href: withImpersonation(r.href), tags: [], status: "Erişilebilir" })) : await authorizedRecords(session, userData, "agents"); setupFilters(); renderCatalog(); }
    else if (page === "projects") { state.records = await authorizedRecords(session, userData, "projects"); setupFilters(); renderCatalog(); }
    else if (page === "overview") { const [projects, agents] = await Promise.all([authorizedRecords(session, userData, "projects"), authorizedRecords(session, userData, "agents")]); renderOverview(userData, projects, agents); }
    else renderModelsOrHistory();
  } catch (error) { console.error("Sayfa verileri yüklenemedi:", error); showState("error", "Veriler yüklenemedi", "Bağlantınızı kontrol edip sayfayı yeniden deneyin."); }
}

init();
