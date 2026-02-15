/* global window, document */

(() => {
  const IMP_EMAIL_KEY = "impersonated_user_key";
  const IMP_ID_KEY = "impersonated_user_id"; // ileride effective-session için faydalı
  const USERS_KEY = "teknoify_users";
  const SESSION_KEY = "teknoify_session";

  const $ = (id) => document.getElementById(id);

  function setStatus(msg) {
    const el = $("status");
    if (el) el.textContent = msg;
  }

  function safeJSONParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function requireAdminSessionOrRedirect() {
    const sessionRaw = window.localStorage.getItem(SESSION_KEY);
    const session = safeJSONParse(sessionRaw, null);

    if (!session || session.role !== "admin") {
      // absolute path -> path buglarından kaçınır
      window.location.assign("/pages/login.html");
      return null;
    }
    return session;
  }

  async function ensureUsersLoaded() {
    // localStorage varsa onu kullan
    const cachedRaw = window.localStorage.getItem(USERS_KEY);
    const cached = safeJSONParse(cachedRaw, null);
    if (Array.isArray(cached) && cached.length > 0) return cached;

    // yoksa data/users.json dene
    try {
      const resp = await fetch("/data/users.json", { cache: "no-store" });
      if (!resp.ok) throw new Error("users.json fetch failed");
      const users = await resp.json();
      if (Array.isArray(users)) {
        window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return users;
      }
    } catch {
      // fallback: hiç yoksa boş liste
    }
    return [];
  }

  function populateUserSelect(users) {
    const select = $("targetUser");
    if (!select) return;

    select.innerHTML = "";

    const nonAdminUsers = users.filter((u) => u && u.role !== "admin");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = nonAdminUsers.length
      ? "Kullanıcı seçiniz..."
      : "Kullanıcı bulunamadı (users seed yok)";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    nonAdminUsers.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u.id; // select value userId
      opt.textContent = `${u.name} (${u.email})`;
      opt.dataset.email = u.email;
      select.appendChild(opt);
    });
  }

  function startImpersonationByUser(users, userId, targetPath) {
    const target = users.find((u) => u && u.id === userId);
    if (!target) {
      setStatus("Kullanıcı bulunamadı.");
      return;
    }
    if (target.role === "admin") {
      setStatus("Admin hesap impersonate edilemez.");
      return;
    }

    window.localStorage.setItem(IMP_EMAIL_KEY, String(target.email || "").trim().toLowerCase());
    window.localStorage.setItem(IMP_ID_KEY, target.id);

    setStatus(`Impersonate aktif: ${target.email} → yönlendiriliyor...`);

    const dest = targetPath || "/dashboard/member.html";
    window.location.assign(dest);
  }

  function stopImpersonation() {
    window.localStorage.removeItem(IMP_EMAIL_KEY);
    window.localStorage.removeItem(IMP_ID_KEY);
    setStatus("Impersonate kapatıldı. Admin paneline yönlendiriliyor...");
    window.location.assign("/dashboard/admin.html");
  }

  function initFromQuery(users) {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    const to = params.get("to");
    if (userId) {
      startImpersonationByUser(users, userId, to || "/dashboard/member.html");
      return true;
    }
    return false;
  }

  async function boot() {
    // 1) admin guard
    const session = requireAdminSessionOrRedirect();
    if (!session) return;

    // 2) users load + select doldur
    const users = await ensureUsersLoaded();
    populateUserSelect(users);

    // 3) query param ile direkt başlatma (admin.js’ten linkleyeceğiz)
    if (initFromQuery(users)) return;

    // 4) UI wiring
    const form = $("impersonate-form");
    const stopBtn = $("stop-impersonation");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const sel = $("targetUser");
        const to = $("targetPath")?.value;

        const userId = sel?.value;
        if (!userId) {
          setStatus("Lütfen bir kullanıcı seç.");
          return;
        }
        startImpersonationByUser(users, userId, to);
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", () => stopImpersonation());
    }

    const current = window.localStorage.getItem(IMP_EMAIL_KEY);
    if (current) setStatus(`Şu an impersonate aktif: ${current}`);
  }

  boot();
})();
