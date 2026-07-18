const DEFAULT_NAME = "Yükleniyor...";
const FALLBACK_INITIAL = "U";

let mounted = false;
let rootEl = null;
let profileTrigger = null;
let lastIdentity = { name: "", photoURL: "" };
let lastAdmin = { visible: false, href: "" };
let profileClickHandler = null;

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function getInitial(name) {
  return (normalizeText(name).charAt(0) || FALLBACK_INITIAL).toLocaleUpperCase("tr-TR");
}

function el(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") node.className = value;
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  });
  if (text) node.textContent = text;
  return node;
}

function buildTopbar() {
  const header = el("header", { className: "top-bar tk-member-topbar" });
  const greeting = el("h2", { className: "tk-member-greeting" });
  greeting.append(document.createTextNode("Hoşgeldin, "));
  greeting.append(el("span", { id: "user-name-title" }, DEFAULT_NAME));

  const actions = el("div", { className: "tk-member-topbar-actions" });
  actions.append(el("div", { id: "tk-member-admin-slot", className: "tk-member-admin-slot" }));

  profileTrigger = el("button", {
    type: "button",
    className: "user-profile profile-trigger tk-member-profile-trigger",
    id: "tk-member-profile-trigger",
    "aria-label": "Profilinizi açın",
    "aria-haspopup": "dialog"
  });
  profileTrigger.append(el("span", { id: "user-name-display" }, DEFAULT_NAME));
  profileTrigger.append(el("span", { className: "avatar", id: "user-avatar", "aria-hidden": "true" }, FALLBACK_INITIAL));
  profileTrigger.append(el("i", { className: "fas fa-chevron-down", "aria-hidden": "true" }));
  actions.append(profileTrigger);
  header.append(greeting, actions);
  return header;
}

function openProfile() {
  if (window.SharedProfileManager && typeof window.SharedProfileManager.openModal === "function") {
    window.SharedProfileManager.openModal();
  }
}

function attachProfileListener() {
  if (!profileTrigger) return;
  if (!profileClickHandler) profileClickHandler = () => openProfile();
  profileTrigger.removeEventListener("click", profileClickHandler);
  profileTrigger.addEventListener("click", profileClickHandler);
}

function mount(root = document.getElementById("tk-member-topbar-root")) {
  if (!root) return null;
  rootEl = root;
  if (mounted && root.dataset.tkMemberTopbarMounted === "true") {
    profileTrigger = root.querySelector("#tk-member-profile-trigger");
    attachProfileListener();
    return root.querySelector(".tk-member-topbar");
  }
  root.textContent = "";
  root.append(buildTopbar());
  root.dataset.tkMemberTopbarMounted = "true";
  mounted = true;
  attachProfileListener();
  if (lastIdentity.name || lastIdentity.photoURL) setIdentity(lastIdentity);
  setAdminAccess(lastAdmin);
  return root.querySelector(".tk-member-topbar");
}

function setIdentity({ name, photoURL } = {}) {
  const normalizedName = normalizeText(name) || "Teknoify Kullanıcısı";
  const normalizedPhoto = normalizeText(photoURL);
  if (lastIdentity.name === normalizedName && lastIdentity.photoURL === normalizedPhoto) return;
  lastIdentity = { name: normalizedName, photoURL: normalizedPhoto };
  if (!mounted) mount();
  const title = document.getElementById("user-name-title");
  const display = document.getElementById("user-name-display");
  const avatar = document.getElementById("user-avatar");
  if (title && title.textContent !== normalizedName) title.textContent = normalizedName;
  if (display && display.textContent !== normalizedName) display.textContent = normalizedName;
  if (!avatar) return;
  const currentPhoto = avatar.dataset.photoUrl || "";
  if (normalizedPhoto) {
    if (currentPhoto === normalizedPhoto && avatar.querySelector("img")) return;
    avatar.textContent = "";
    const img = el("img", { src: normalizedPhoto, alt: "", decoding: "async", "aria-hidden": "true" });
    avatar.append(img);
    avatar.dataset.photoUrl = normalizedPhoto;
  } else {
    const initial = getInitial(normalizedName);
    if (!currentPhoto && avatar.textContent === initial) return;
    avatar.textContent = initial;
    delete avatar.dataset.photoUrl;
  }
}

function setAdminAccess({ visible = false, href = "/dashboard/admin.html" } = {}) {
  const normalized = { visible: Boolean(visible), href: normalizeText(href) || "/dashboard/admin.html" };
  lastAdmin = normalized;
  if (!mounted) mount();
  const slot = document.getElementById("tk-member-admin-slot");
  if (!slot) return;
  if (!normalized.visible) {
    slot.textContent = "";
    return;
  }
  let link = slot.querySelector("#btn-go-admin");
  if (!link) {
    link = el("a", { id: "btn-go-admin", className: "tk-member-admin-button" });
    const icon = el("i", { className: "fas fa-user-shield", "aria-hidden": "true" });
    link.append(icon, document.createTextNode(" Admin Paneli"));
    slot.replaceChildren(link);
  }
  link.href = normalized.href;
}

function isMounted() {
  return mounted && Boolean(rootEl?.querySelector(".tk-member-topbar"));
}

const api = { mount, setIdentity, setAdminAccess, openProfile, isMounted };
window.TK_MEMBER_TOPBAR = api;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
else mount();

export { mount, setIdentity, setAdminAccess, openProfile, isMounted };
