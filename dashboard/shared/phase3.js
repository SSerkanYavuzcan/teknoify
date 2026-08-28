import { requireAuth } from "/js/lib/auth.js";

const page = document.body.dataset.page;

function setIdentity(session) {
  const name = session.name || session.email || "Teknoify Kullanıcısı";
  window.USER_SESSION = { ...session, name, displayName: name };
  window.TK_MEMBER_TOPBAR?.setIdentity({ name, photoURL: "" });
  window.TK_MEMBER_TOPBAR?.setAdminAccess({ visible: Boolean(session.isAdmin), href: "/dashboard/admin.html" });
  window.TK_RENDER_SIDEBAR?.();
  const topbarProfile = document.getElementById("tk-member-profile-trigger");
  if (topbarProfile && session.impersonating) {
    topbarProfile.disabled = true;
    topbarProfile.title = "Kullanıcı görünümünde profil değiştirilemez";
  }
  document.querySelectorAll("[data-session-name]").forEach(node => { node.textContent = name; });
  document.querySelectorAll("[data-session-email]").forEach(node => { node.textContent = session.email || "E-posta bilgisi yok"; });
  document.querySelectorAll("[data-session-initial]").forEach(node => { node.textContent = name.charAt(0).toLocaleUpperCase("tr-TR"); });
}

function setupCopy() {
  document.querySelectorAll("[data-copy-target]").forEach(button => button.addEventListener("click", async () => {
    const status = document.getElementById("copy-status");
    const target = document.getElementById(button.dataset.copyTarget);
    try {
      await navigator.clipboard.writeText(target?.textContent || "");
      button.textContent = "Kopyalandı";
      if (status) status.textContent = "Kod panoya kopyalandı.";
    } catch {
      button.textContent = "Kopyalanamadı";
      if (status) status.textContent = "Pano erişimi sağlanamadı. Kodu elle seçebilirsiniz.";
    }
    setTimeout(() => { button.textContent = "Kopyala"; }, 2200);
  }));
}

function setupFaq() {
  const search = document.getElementById("faq-search");
  if (!search) return;
  const items = [...document.querySelectorAll(".faq")];
  const result = document.getElementById("faq-result");
  search.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase("tr-TR");
    let visible = 0;
    items.forEach(item => { const match = !query || item.textContent.toLocaleLowerCase("tr-TR").includes(query); item.hidden = !match; if (match) visible++; });
    result.textContent = query ? `${visible} yardım konusu bulundu.` : "";
  });
}

async function init() {
  const session = await requireAuth(page === "team" ? { allowedRoles: ["admin"] } : {});
  if (!session) return;
  setIdentity(session);
  setupCopy(); setupFaq();
  const profileButton = document.getElementById("edit-profile");
  if (profileButton) {
    if (session.impersonating) { profileButton.disabled = true; profileButton.title = "Kullanıcı görünümünde profil değiştirilemez"; }
    else profileButton.addEventListener("click", () => window.SharedProfileManager?.openModal({ onboarding: false }));
  }
}
init();
