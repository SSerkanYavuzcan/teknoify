import { requireAuth } from "/js/lib/auth.js";
import "./profile-manager.js";
import { db } from "/js/lib/firebase.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const page = document.body.dataset.page;
const state = { records: [], query: "", category: "tumu", tab: "all", favorites: new Set(), session: null };
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
  const { permissionData: _permissionData, ...publicSession } = session;
  window.USER_SESSION = { ...publicSession, name, displayName: name };
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
const productArtwork = `
<svg viewBox="0 0 720 330" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="cube" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a88cff"/><stop offset="1" stop-color="#5740dc"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <g fill="none" stroke="#7564d8" opacity=".18"><path d="M60 253C158 129 292 86 418 167S635 247 688 109"/><ellipse cx="389" cy="166" rx="218" ry="113" stroke-dasharray="4 7"/><path d="M389 24v284M106 166h552" stroke-dasharray="5 8"/></g>
  <circle cx="390" cy="165" r="76" fill="#7658ef" opacity=".09"/><circle cx="390" cy="165" r="53" stroke="#b8aaff" stroke-width="2" filter="url(#glow)"/>
  <g filter="url(#glow)"><path d="m390 135 28 16v32l-28 16-28-16v-32z" fill="url(#cube)" stroke="#d7ceff"/><path d="m362 151 28 17 28-17m-28 17v31" fill="none" stroke="#e8e2ff"/></g>
  <g fill="none" stroke="#b8aaff" stroke-width="4"><circle cx="423" cy="194" r="15" fill="#18162f"/><path d="m434 205 18 18"/></g>
  <g transform="translate(42 52)"><rect width="151" height="70" rx="8" fill="#151a28" fill-opacity=".88" stroke="#343a4e"/><path d="M25 44V29a17 17 0 0 1 34 0v15m-34-8h7v15h-7zm27 0h7v15h-7z" fill="none" stroke="#8177a9"/><path d="M77 21h52M77 31h43M77 42h48" stroke="#53596b"/><path d="M78 54h8m5 0h8m5 0h8" stroke="#ae9cff"/></g>
  <g transform="translate(68 229)"><rect width="166" height="70" rx="8" fill="#151a28" fill-opacity=".9" stroke="#343a4e"/><path d="M18 48h51l-4 7H14zM23 22h39v26H23z" fill="#222838" stroke="#777e98"/><path d="M83 25h57M83 35h46M83 46h53" stroke="#53596b"/><path d="M84 57h8m5 0h8m5 0h8" stroke="#ae9cff"/></g>
  <g transform="translate(526 211)"><rect width="166" height="70" rx="8" fill="#151a28" fill-opacity=".9" stroke="#343a4e"/><ellipse cx="35" cy="29" rx="13" ry="5" fill="#292c3e" stroke="#757b94"/><path d="M22 29v25c0 7 26 7 26 0V29" fill="#252939" stroke="#686e87"/><path d="M69 24h66M69 35h52M69 46h61" stroke="#53596b"/><path d="M70 57h8m5 0h8m5 0h8" stroke="#ae9cff"/></g>
</svg>`;
function safeFavorites(session) {
  if (session.impersonating) return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(`teknoify_agent_favorites_${session.uid}`) || "[]")); } catch { return new Set(); }
}
function saveFavorites(session) { if (session.impersonating) return; try { localStorage.setItem(`teknoify_agent_favorites_${session.uid}`, JSON.stringify([...state.favorites])); } catch { /* Depolama kullanılamadığında görünüm çalışmaya devam eder. */ } }
function agentFeature(record, session) {
  const article = element("article", "agent-feature");
  article.dataset.agentId = record.id;
  const info = element("div", "agent-feature__info");
  const icon = element("span", "agent-feature__icon"); icon.append(element("i", record.icon || "fas fa-robot"));
  const category = element("p", "agent-feature__category", record.category || "Ajan");
  const title = element("h3", "", record.name); const status = element("span", "agent-feature__status", record.status || "Erişilebilir");
  const bookmark = element("button", `agent-feature__bookmark${state.favorites.has(record.id) ? " is-active" : ""}`); bookmark.type = "button"; bookmark.setAttribute("aria-label", state.favorites.has(record.id) ? `${record.name} favorilerden çıkar` : `${record.name} favorilere ekle`); bookmark.setAttribute("aria-pressed", String(state.favorites.has(record.id))); bookmark.append(element("i", state.favorites.has(record.id) ? "fas fa-bookmark" : "far fa-bookmark"));
  bookmark.addEventListener("click", () => {
    state.favorites.has(record.id) ? state.favorites.delete(record.id) : state.favorites.add(record.id);
    saveFavorites(session);
    updateFavoriteButton(bookmark, record);
    if (state.tab === "favorites") renderAgentCatalog(session);
  });
  const referenceDescription = record.id === "product-discover" ? "Ürünleri keşfedin, karşılaştırın ve ihtiyacınıza uygun sonuçlara daha hızlı ulaşın." : record.description;
  const description = element("p", "agent-feature__description", referenceDescription || "Bu ajanın mevcut çalışma alanını ve desteklenen yeteneklerini inceleyin.");
  const tags = element("div", "agent-feature__tags"); const capabilities = record.id === "product-discover" && !record.tags.length ? ["Ürün araştırması", "Karşılaştırma", "Akıllı keşif"] : record.tags; capabilities.slice(0, 4).forEach(tag => tags.append(element("span", "", tag)));
  const actions = element("div", "agent-feature__actions"); if (record.href) { const open = element("a", "agent-feature__open", "Ajanı aç"); open.href = record.href; open.append(element("i", "fas fa-arrow-right")); actions.append(open); }
  const details = element("button", "agent-feature__details", "Detayları incele"); details.type = "button"; details.append(element("i", "fas fa-arrow-right")); details.addEventListener("click", () => openAgentDetails(record, referenceDescription, capabilities)); actions.append(details);
  info.append(icon, category, title, status, bookmark, description, tags, actions);
  const art = element("div", "agent-feature__art"); art.setAttribute("aria-hidden", "true"); art.innerHTML = productArtwork;
  article.append(info, art); return article;
}
function updateFavoriteButton(button, record) {
  const favorite = state.favorites.has(record.id);
  button.classList.toggle("is-active", favorite);
  button.setAttribute("aria-label", favorite ? `${record.name} favorilerden çıkar` : `${record.name} favorilere ekle`);
  button.setAttribute("aria-pressed", String(favorite));
  button.querySelector("i").className = favorite ? "fas fa-bookmark" : "far fa-bookmark";
}
function openAgentDetails(record, description, capabilities) { const dialog = document.getElementById("agent-details-dialog"); document.getElementById("agent-details-title").textContent = record.name; const content = document.getElementById("agent-details-content"); content.replaceChildren(element("p", "", description)); if (capabilities.length) { const heading = element("h3", "", "Yetenekler"); const list = element("ul"); capabilities.forEach(value => list.append(element("li", "", value))); content.append(heading, list); } dialog.showModal(); }
function agentMatches(record) { return matches(record) && (state.tab !== "favorites" || state.favorites.has(record.id)); }
function renderAgentCatalog(session) {
  const filtered = state.records.filter(agentMatches); document.getElementById("agent-total-count").textContent = state.records.length; document.getElementById("result-count").textContent = `${filtered.length} ajan`;
  if (!state.records.length) return showState("empty", "Erişilebilir ajan bulunamadı", "Hesabınıza bir ajan erişimi tanımlandığında kayıtlar burada görünecek.");
  if (!filtered.length) return showState("empty", state.tab === "favorites" ? "Henüz favori ajanınız yok" : "Aramanızla eşleşen ajan yok", state.tab === "favorites" ? "Kitap ayracı simgesiyle erişilebilir ajanları favorilerinize ekleyebilirsiniz." : "Arama ifadenizi veya kategori seçiminizi değiştirin.", state.tab !== "favorites");
  const root = document.getElementById("phase2-results");
  const existing = new Map([...root.querySelectorAll("[data-agent-id]")].map(node => [node.dataset.agentId, node]));
  root.replaceChildren(...filtered.map(record => existing.get(record.id) || agentFeature(record, session)));
}
function setupAgentLibrary(session) {
  state.session = session; state.favorites = safeFavorites(session); const select = document.getElementById("catalog-category"); [...new Set(state.records.map(r => r.category).filter(Boolean))].sort().forEach(value => { const option = element("option", "", value); option.value = value; select.append(option); });
  document.getElementById("catalog-search").addEventListener("input", event => { state.query = event.target.value.trim(); renderAgentCatalog(session); }); select.addEventListener("change", event => { state.category = event.target.value; renderAgentCatalog(session); });
  document.querySelectorAll("[data-agent-tab]").forEach(button => button.addEventListener("click", () => { state.tab = button.dataset.agentTab; document.querySelectorAll("[data-agent-tab]").forEach(tab => { const active = tab === button; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", String(active)); }); renderAgentCatalog(session); }));
  const filterButton = document.getElementById("agent-filter-button"), popover = document.getElementById("agent-filter-popover"); filterButton.addEventListener("click", () => { popover.hidden = !popover.hidden; filterButton.setAttribute("aria-expanded", String(!popover.hidden)); if (!popover.hidden) select.focus(); });
  const shortcut = document.getElementById("agent-search-shortcut"); shortcut.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K"; document.addEventListener("keydown", event => { const editing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !editing) { event.preventDefault(); document.getElementById("catalog-search").focus(); } });
  document.querySelectorAll("[data-open-agent-guide]").forEach(button => button.addEventListener("click", () => document.getElementById("agent-guide-dialog").showModal())); document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => button.closest("dialog").close())); document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); }));
}
function resetFilters() { state.query = ""; state.category = "tumu"; document.getElementById("catalog-search").value = ""; document.getElementById("catalog-category").value = "tumu"; page === "agents" ? renderAgentCatalog(state.session) : renderCatalog(); }
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
  performance.mark("teknoify:app-init");
  const session = await requireAuth(); if (!session) return; setIdentity(session);
  performance.mark("teknoify:auth-ready");
  if (!copy[page]) {
    const descriptions = { api: "API erişimlerinizi güvenli biçimde yönetin.", docs: "Geliştirici kaynaklarına ve entegrasyon rehberlerine ulaşın.", webhooks: "Webhook entegrasyonlarınızı yönetin.", usage: "Abonelik ve kullanım bilgilerinizi görüntüleyin.", invoices: "Faturalandırma kayıtlarınızı görüntüleyin.", team: "Kuruluşunuzun takım yönetimi alanı.", profile: "Profil ve hesap güvenliği ayarlarınızı yönetin.", help: "Teknoify ürünleri için yardım kaynaklarına ulaşın." };
    const titleNode = document.getElementById("app-shell-title"); const descriptionNode = document.getElementById("app-shell-description");
    if (titleNode) titleNode.textContent = document.body.dataset.title || "Teknoify";
    if (descriptionNode) descriptionNode.textContent = descriptions[page] || "Bu alan yakında kullanıma açılacak.";
    return;
  }
  const [title, description] = copy[page]; document.getElementById("phase2-title").textContent = title; document.getElementById("phase2-description").textContent = description;
  try {
    const userData = session.permissionData || {};
    performance.mark("teknoify:permission-data-ready");
    if (page === "agents") { state.records = await authorizedRecords(session, userData, "agents"); performance.mark("teknoify:agent-data-ready"); setupAgentLibrary(session); renderAgentCatalog(session); performance.mark("teknoify:first-usable-catalog-render"); }
    else if (page === "tools") { state.records = builtIns.tools.map(r => ({ ...r, href: withImpersonation(r.href), tags: [], status: "Erişilebilir" })); setupFilters(); renderCatalog(); }
    else if (page === "projects") { state.records = await authorizedRecords(session, userData, "projects"); setupFilters(); renderCatalog(); }
    else if (page === "overview") { const [projects, agents] = await Promise.all([authorizedRecords(session, userData, "projects"), authorizedRecords(session, userData, "agents")]); renderOverview(userData, projects, agents); }
    else renderModelsOrHistory();
  } catch (error) { console.error("Sayfa verileri yüklenemedi:", error); showState("error", "Veriler yüklenemedi", "Bağlantınızı kontrol edip sayfayı yeniden deneyin."); }
}

init();
