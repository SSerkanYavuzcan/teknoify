import { logout } from "/js/lib/auth.js";

const STORAGE_KEY = "teknoify_sidebar_collapsed";
const MOBILE_QUERY = "(max-width: 768px)";

export const NAVIGATION = Object.freeze([
  { id: "overview", label: "Genel Bakış", icon: "house", url: "/dashboard/member.html" },
  { section: "AI Hub", items: [
    { id: "agents", label: "Ajan Kütüphanesi", icon: "robot", url: "/dashboard/ai-hub/agents.html", routes: ["/dashboard/agents/"] },
    { id: "tools", label: "Araçlar & Servisler", icon: "tools", url: "/dashboard/ai-hub/tools.html", routes: ["/dashboard/web-scraping/", "/dashboard/geo-intelligence/"] },
    { id: "models", label: "Özel Modellerim", icon: "brain", url: "/dashboard/ai-hub/models.html" }
  ]},
  { section: "Çalışma Alanı", items: [
    { id: "projects", label: "Aktif Projeler", icon: "folder", url: "/dashboard/workspace/projects.html", routes: ["/dashboard/services/"] },
    { id: "history", label: "İşlem Geçmişi", icon: "history", url: "/dashboard/workspace/history.html" }
  ]},
  { section: "Geliştirici Merkezi", items: [
    { id: "api", label: "API Yönetimi", icon: "key", url: "/dashboard/developer/api.html", routes: ["/dashboard/bim-istekleri/"] },
    { id: "docs", label: "Dokümantasyon", icon: "book", url: "/dashboard/developer/docs.html" },
    { id: "webhooks", label: "Webhooks", icon: "nodes", url: "/dashboard/developer/webhooks.html" }
  ]},
  { section: "Faturalandırma & Organizasyon", items: [
    { id: "usage", label: "Abonelik ve Kullanım", icon: "card", url: "/dashboard/billing/usage.html", routes: ["/dashboard/member/subscriptions/"] },
    { id: "invoices", label: "Faturalar", icon: "receipt", url: "/dashboard/billing/invoices.html" },
    { id: "team", label: "Takım", icon: "users", url: "/dashboard/organization/team.html", access: "admin" }
  ]},
  { section: "Destek & Ayarlar", items: [
    { id: "profile", label: "Profil ve Güvenlik", icon: "shield-user", url: "/dashboard/settings/profile.html" },
    { id: "help", label: "Yardım Merkezi", icon: "help", url: "/dashboard/support/help.html" }
  ]}
]);

const SIDEBAR_ICONS = Object.freeze({
  house: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/>',
  robot: '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M9 3h6M8 12h.01M16 12h.01M8.5 16h7"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L4 17l3 3 8.3-8.3a4 4 0 0 0 5-5L18 9l-3-3 2.3-2.3"/>',
  brain: '<path d="M9.5 4.5a3 3 0 0 0-5 2.2 3.5 3.5 0 0 0-1 6.5A3.5 3.5 0 0 0 7 18.5 3 3 0 0 0 12 20V7a3 3 0 0 0-2.5-2.5Z"/><path d="M14.5 4.5a3 3 0 0 1 5 2.2 3.5 3.5 0 0 1 1 6.5 3.5 3.5 0 0 1-3.5 5.3A3 3 0 0 1 12 20M8 9a3 3 0 0 0 4 2M16 9a3 3 0 0 1-4 2M8 15a3 3 0 0 1 4-2M16 15a3 3 0 0 0-4-2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4M12 7v5l3 2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M15 8l3 3M17 6l2 2"/>',
  book: '<path d="M3.5 5.5A3.5 3.5 0 0 1 7 4h5v16H7a3.5 3.5 0 0 0-3.5 1.5ZM20.5 5.5A3.5 3.5 0 0 0 17 4h-5v16h5a3.5 3.5 0 0 1 3.5 1.5Z"/>',
  nodes: '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="m7.3 10.8 9.4-4.6M7.3 13.2l9.4 4.6"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  users: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="4"/><path d="M17 11a3.5 3.5 0 0 0 0-7M22 20v-1.5a4 4 0 0 0-3-3.7"/>',
  "shield-user": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><circle cx="12" cy="9" r="2.5"/><path d="M8.5 16a3.5 3.5 0 0 1 7 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.2 2.4c-.9.4-.9 1-.9 1.8M12 17h.01"/>'
});

function sidebarIcon(name) {
  return `<svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${SIDEBAR_ICONS[name]}</svg>`;
}

let injected = false;
let initializedUid = "";
let drawerTrigger = null;
let lastFocus = null;

function safeStorage(method, value) {
  try { return method === "get" ? localStorage.getItem(STORAGE_KEY) : localStorage.setItem(STORAGE_KEY, value); }
  catch { return null; }
}

function normalizedPath(value = window.location.pathname) {
  let path;
  try { path = new URL(value, window.location.origin).pathname; } catch { path = String(value).split("?")[0]; }
  path = path.toLowerCase().replace(/\/index\.html$/, "/").replace(/\/$/, "");
  return path || "/";
}

function isActive(item) {
  const current = normalizedPath();
  const exact = normalizedPath(item.url);
  if (current === exact) return true;
  return (item.routes || []).some(route => {
    const prefix = normalizedPath(route);
    return current === prefix || current.startsWith(`${prefix}/`);
  });
}

function withImpersonation(url) {
  let uid = "";
  try { uid = localStorage.getItem("teknoify_impersonate_uid") || ""; } catch {}
  if (!uid) return url;
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("imp_uid", uid);
  return `${parsed.pathname}${parsed.search}`;
}

function link(item) {
  const active = isActive(item);
  return `<a class="menu-item${active ? " active" : ""}" href="${withImpersonation(item.url)}" data-nav-id="${item.id}" aria-label="${item.label}" title="${item.label}"${active ? ' aria-current="page"' : ""}>${sidebarIcon(item.icon)}<span>${item.label}</span></a>`;
}

function navigationMarkup() {
  return NAVIGATION.map(entry => entry.items
    ? `<section class="tk-nav-group" data-access="${entry.items.some(item => item.access) ? "conditional" : "public"}"><h2>${entry.section}</h2>${entry.items.map(item => `<div${item.access ? ` data-requires="${item.access}" hidden` : ""}>${link(item)}</div>`).join("")}</section>`
    : link(entry)).join("");
}

function injectSidebarSkeleton() {
  const root = document.getElementById("tk-global-sidebar-root");
  if (!root || injected || root.dataset.injected === "true") return;
  document.body.classList.toggle("sidebar-collapsed", !matchMedia(MOBILE_QUERY).matches && safeStorage("get") === "true");
  root.innerHTML = `<aside class="sidebar" id="tk-app-sidebar" aria-label="Uygulama kenar çubuğu">
    <div class="sidebar-brand"><a href="/" class="brand brand-home-link" aria-label="Teknoify ana sayfasına git"><i class="fas fa-cube" aria-hidden="true"></i><span>Teknoify</span></a><button class="sidebar-mobile-close" type="button" aria-label="Menüyü kapat"><i class="fas fa-xmark" aria-hidden="true"></i></button></div>
    <nav id="tk-main-nav-container" aria-label="Ana menü">${navigationMarkup()}</nav>
    <footer class="sidebar-footer"><div class="sidebar-account"><span class="sidebar-account-avatar" aria-hidden="true">T</span><span class="sidebar-account-copy"><strong id="tk-sidebar-user">Hesap yükleniyor</strong><small id="tk-sidebar-email"></small></span></div><div class="sidebar-footer-actions"><button class="btn-logout" type="button" aria-label="Çıkış yap" title="Çıkış yap"><i class="fas fa-arrow-right-from-bracket" aria-hidden="true"></i><span>Çıkış</span></button><button class="btn-collapse" type="button" aria-expanded="true" aria-label="Menüyü daralt" title="Menüyü daralt"><i class="fas fa-chevron-left" aria-hidden="true"></i></button></div></footer>
  </aside><div class="sidebar-backdrop" hidden></div>
  <div class="tk-logout-modal" id="tk-logout-modal" role="dialog" aria-modal="true" aria-labelledby="tk-logout-title" hidden><div class="tk-modal-inner"><h2 id="tk-logout-title">Çıkış Yap</h2><p>Hesabınızdan çıkış yapmak istediğinize emin misiniz?</p><div><button type="button" data-logout-cancel>İptal</button><button type="button" data-logout-confirm><i class="fas fa-power-off" aria-hidden="true"></i> Çıkış Yap</button></div></div></div>`;
  root.dataset.injected = "true";
  injected = true;
  setupEvents();
}

function mobileOpen(open, trigger) {
  const sidebar = document.getElementById("tk-app-sidebar");
  const backdrop = document.querySelector(".sidebar-backdrop");
  if (!sidebar || !backdrop) return;
  if (open) { lastFocus = trigger || document.activeElement; document.body.classList.add("sidebar-drawer-open"); document.body.style.overflow = "hidden"; backdrop.hidden = false; document.querySelector("main")?.setAttribute("inert", ""); sidebar.querySelector("a,button")?.focus(); }
  else { document.body.classList.remove("sidebar-drawer-open"); document.body.style.overflow = ""; backdrop.hidden = true; document.querySelector("main")?.removeAttribute("inert"); lastFocus?.focus?.(); lastFocus = null; }
  drawerTrigger = drawerTrigger || document.getElementById("tk-sidebar-menu-button");
  drawerTrigger?.setAttribute("aria-expanded", String(open));
}

function toggleSidebar() {
  if (matchMedia(MOBILE_QUERY).matches) return mobileOpen(!document.body.classList.contains("sidebar-drawer-open"), document.getElementById("tk-sidebar-menu-button"));
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  safeStorage("set", String(collapsed));
  const button = document.querySelector(".btn-collapse");
  button?.setAttribute("aria-expanded", String(!collapsed));
  button?.setAttribute("aria-label", collapsed ? "Menüyü genişlet" : "Menüyü daralt");
  button?.setAttribute("title", collapsed ? "Menüyü genişlet" : "Menüyü daralt");
}

function setupEvents() {
  drawerTrigger = document.getElementById("tk-sidebar-menu-button");
  if (!drawerTrigger) {
    const topbar = document.querySelector(".top-bar");
    if (topbar) {
      drawerTrigger = document.createElement("button");
      drawerTrigger.id = "tk-sidebar-menu-button";
      drawerTrigger.type = "button";
      drawerTrigger.setAttribute("aria-label", "Ana menüyü aç");
      drawerTrigger.setAttribute("aria-controls", "tk-app-sidebar");
      drawerTrigger.setAttribute("aria-expanded", "false");
      drawerTrigger.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
      topbar.prepend(drawerTrigger);
      drawerTrigger.addEventListener("click", toggleSidebar);
    }
  }
  document.querySelector(".btn-collapse")?.addEventListener("click", toggleSidebar);
  document.querySelector(".sidebar-mobile-close")?.addEventListener("click", () => mobileOpen(false));
  document.querySelector(".sidebar-backdrop")?.addEventListener("click", () => mobileOpen(false));
  document.querySelector(".btn-logout")?.addEventListener("click", window.logoutApp);
  document.querySelector("[data-logout-cancel]")?.addEventListener("click", window.closeLogoutModal);
  document.querySelector("[data-logout-confirm]")?.addEventListener("click", window.executeLogout);
  document.querySelector("#tk-main-nav-container")?.addEventListener("click", event => { if (event.target.closest("a") && matchMedia(MOBILE_QUERY).matches) mobileOpen(false); });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") mobileOpen(false);
    if (event.key !== "Tab" || !document.body.classList.contains("sidebar-drawer-open")) return;
    const focusable = [...document.querySelectorAll("#tk-app-sidebar a, #tk-app-sidebar button")].filter(el => !el.hidden);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  matchMedia(MOBILE_QUERY).addEventListener("change", () => { mobileOpen(false); document.body.classList.toggle("sidebar-collapsed", !matchMedia(MOBILE_QUERY).matches && safeStorage("get") === "true"); });
}

export async function initSidebar() {
  injectSidebarSkeleton();
  const session = window.USER_SESSION;
  if (!session) return;
  const name = session.displayName || session.name || "Teknoify Kullanıcısı";
  document.getElementById("tk-sidebar-user").textContent = name;
  document.getElementById("tk-sidebar-email").textContent = session.email || "";
  document.querySelector(".sidebar-account-avatar").textContent = name.charAt(0).toLocaleUpperCase("tr-TR") || "T";
  document.querySelectorAll('[data-requires="admin"]').forEach(el => { el.hidden = !session.isAdmin; });
  if (initializedUid === session.uid) return;
  initializedUid = session.uid;
  document.dispatchEvent(new CustomEvent("tk-sidebar-ready", { detail: { session } }));
}

window.TK_NAVIGATION = NAVIGATION;
window.TK_RENDER_SIDEBAR = initSidebar;
window.toggleSidebar = toggleSidebar;
window.logoutApp = () => { document.getElementById("tk-logout-modal")?.removeAttribute("hidden"); };
window.closeLogoutModal = () => { document.getElementById("tk-logout-modal")?.setAttribute("hidden", ""); };
window.executeLogout = async () => { window.closeLogoutModal(); await logout(); };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectSidebarSkeleton, { once: true });
else injectSidebarSkeleton();
