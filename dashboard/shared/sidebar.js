import { logout } from "/js/lib/auth.js";

const STORAGE_KEY = "teknoify_sidebar_collapsed";
const MOBILE_QUERY = "(max-width: 768px)";

export const NAVIGATION = Object.freeze([
  { id: "overview", label: "Genel Bakış", icon: "fas fa-house", url: "/dashboard/member.html" },
  { section: "AI HUB", items: [
    { id: "agents", label: "Ajan Kütüphanesi", icon: "fas fa-robot", url: "/dashboard/ai-hub/agents.html", routes: ["/dashboard/agents/"] },
    { id: "tools", label: "Araçlar & Servisler", icon: "fas fa-wand-magic-sparkles", url: "/dashboard/ai-hub/tools.html", routes: ["/dashboard/web-scraping/", "/dashboard/geo-intelligence/"] },
    { id: "models", label: "Özel Modellerim", icon: "fas fa-brain", url: "/dashboard/ai-hub/models.html" }
  ]},
  { section: "ÇALIŞMA ALANI", items: [
    { id: "projects", label: "Aktif Projeler", icon: "fas fa-folder-open", url: "/dashboard/workspace/projects.html", routes: ["/dashboard/services/"] },
    { id: "history", label: "İşlem Geçmişi", icon: "fas fa-clock-rotate-left", url: "/dashboard/workspace/history.html" }
  ]},
  { section: "GELİŞTİRİCİ MERKEZİ", items: [
    { id: "api", label: "API Yönetimi", icon: "fas fa-key", url: "/dashboard/developer/api.html", routes: ["/dashboard/bim-istekleri/"] },
    { id: "docs", label: "Dokümantasyon", icon: "fas fa-book", url: "/dashboard/developer/docs.html" },
    { id: "webhooks", label: "Webhooks", icon: "fas fa-code-branch", url: "/dashboard/developer/webhooks.html" }
  ]},
  { section: "FATURALANDIRMA & ORGANİZASYON", items: [
    { id: "usage", label: "Abonelik ve Kullanım", icon: "fas fa-chart-pie", url: "/dashboard/billing/usage.html", routes: ["/dashboard/member/subscriptions/"] },
    { id: "invoices", label: "Faturalar", icon: "fas fa-file-invoice", url: "/dashboard/billing/invoices.html" },
    { id: "team", label: "Takım", icon: "fas fa-users", url: "/dashboard/organization/team.html", access: "admin" }
  ]},
  { section: "DESTEK & AYARLAR", items: [
    { id: "profile", label: "Profil ve Güvenlik", icon: "fas fa-user-shield", url: "/dashboard/settings/profile.html" },
    { id: "help", label: "Yardım Merkezi", icon: "fas fa-circle-question", url: "/dashboard/support/help.html" }
  ]}
]);

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
  return `<a class="menu-item${active ? " active" : ""}" href="${withImpersonation(item.url)}" data-nav-id="${item.id}" aria-label="${item.label}" title="${item.label}"${active ? ' aria-current="page"' : ""}><i class="${item.icon}" aria-hidden="true"></i><span>${item.label}</span></a>`;
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
