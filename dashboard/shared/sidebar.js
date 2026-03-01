/**
 * dashboard/shared/sidebar.js
 * Dynamic sidebar:
 * - Home link always visible
 * - Services list from USER_SESSION.projectIds (Firestore: /projects/{id})
 * Requires:
 *   - auth.js sets window.USER_SESSION
 *   - firebase/firestore exposed as window.db
 */

(function () {
  async function fetchProjectsByIds(projectIds) {
    if (!window.db) return [];
    const ids = Array.isArray(projectIds) ? projectIds : [];
    if (!ids.length) return [];

    const out = [];
    for (const id of ids) {
      try {
        const snap = await window.db.collection("projects").doc(id).get();
        if (snap.exists) out.push({ id, ...(snap.data() || {}) });
      } catch (e) {
        // ignore single doc errors
      }
    }

    // active first, then name
    out.sort((a, b) => {
      const aAct = a.status === "active" ? 1 : 0;
      const bAct = b.status === "active" ? 1 : 0;
      if (aAct !== bAct) return bAct - aAct;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    return out;
  }

  function iconHtml(icon) {
    const i = String(icon || "").trim();
    return i ? `<i class="${i}"></i>` : `<i class="fas fa-cube"></i>`;
  }

  function normalizeHref(href) {
    const h = String(href || "").trim();
    if (!h) return "#";
    return h; // allow /dashboard/... or ../... or full url
  }

  function currentPath() {
    return (window.location.pathname || "").toLowerCase();
  }

  function toComparablePath(href) {
    const h = String(href || "").trim();
    if (!h) return "";
    // If absolute URL, extract pathname
    try {
      if (h.startsWith("http://") || h.startsWith("https://")) {
        return new URL(h).pathname.toLowerCase();
      }
    } catch {}
    // If relative, best-effort compare by filename
    return h.toLowerCase();
  }

  function isActiveLink(href) {
    const p = currentPath();
    const h = toComparablePath(href);
    if (!h || h === "#") return false;

    // direct contains for /dashboard/... paths
    if (h.startsWith("/")) return p === h || p.startsWith(h);

    // fallback: compare by filename
    const file = h.split("/").pop();
    return file ? p.endsWith(file) : false;
  }

  function renderIntoNewLayout(projects) {
    const container = document.getElementById("tk-sidebar-projects");
    if (!container) return false;

    const items = projects.map((p) => {
      const href = normalizeHref(p.demoUrl || p.demo_url || p.href || p.url);
      const active = isActiveLink(href) ? "active" : "";
      return `
        <a href="${href}" class="menu-item ${active}" data-project="${p.id}">
          ${iconHtml(p.icon)}
          <span>${p.name || p.id}</span>
        </a>
      `;
    });

    container.innerHTML = items.join("\n") || "";

    // show "Hizmetler" header if there is at least 1 item
    const header = document.getElementById("tk-sidebar-services-header");
    if (header) header.style.display = projects.length ? "block" : "none";

    return true;
  }

  function renderIntoLegacyNav(projects) {
    const nav = document.getElementById("tk-sidebar-nav");
    if (!nav) return false;

    const homeHref = "/dashboard/member.html";

    const items = [];
    items.push(`
      <a href="${homeHref}" class="menu-item ${isActiveLink(homeHref) ? "active" : ""}">
        <i class="fas fa-home"></i> <span>Genel Bakış</span>
      </a>
      <div style="margin-top:10px;margin-bottom:5px;padding-left:16px;font-size:0.75rem;color:#666;font-weight:700;text-transform:uppercase;${projects.length ? "" : "display:none;"}" id="tk-sidebar-services-header-legacy">
        <span>Hizmetler</span>
      </div>
    `);

    projects.forEach((p) => {
      const href = normalizeHref(p.demoUrl || p.demo_url || p.href || p.url);
      const active = isActiveLink(href) ? "active" : "";
      items.push(`
        <a href="${href}" class="menu-item ${active}" data-project="${p.id}">
          ${iconHtml(p.icon)}
          <span>${p.name || p.id}</span>
        </a>
      `);
    });

    nav.innerHTML = items.join("\n");
    return true;
  }

  async function initSidebar() {
    const sess = window.USER_SESSION;
    if (!sess) return;

    const projectIds = Array.isArray(sess.projectIds) ? sess.projectIds : [];
    const projects = await fetchProjectsByIds(projectIds);

    // Try new layout first, then legacy
    const okNew = renderIntoNewLayout(projects);
    if (!okNew) renderIntoLegacyNav(projects);
  }

  window.TK_RENDER_SIDEBAR = initSidebar;
})();
