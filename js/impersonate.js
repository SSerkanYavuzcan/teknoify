/* global window, document */

(() => {
  const KEY = "impersonated_user_key";

  const $ = (id) => document.getElementById(id);

  function setStatus(msg) {
    const el = $("status");
    if (el) el.textContent = msg;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function startImpersonation(targetEmail, targetPath) {
    const email = normalizeEmail(targetEmail);
    if (!email) {
      setStatus("E-posta boş olamaz.");
      return;
    }

    localStorage.setItem(KEY, email);
    setStatus(`Impersonate aktif: ${email} → yönlendiriliyor...`);

    const dest = targetPath || "/dashboard/member.html";
    window.location.assign(dest);
  }

  function stopImpersonation() {
    localStorage.removeItem(KEY);
    setStatus("Impersonate kapatıldı. Admin paneline yönlendiriliyor...");
    window.location.assign("/dashboard/admin.html");
  }

  function initFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    const to = params.get("to");

    if (email) {
      startImpersonation(email, to || "/dashboard/member.html");
      return true;
    }
    return false;
  }

  function wireUI() {
    const form = $("impersonate-form");
    const stopBtn = $("stop-impersonation");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = $("targetEmail")?.value;
        const to = $("targetPath")?.value;
        startImpersonation(email, to);
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", () => stopImpersonation());
    }

    const current = localStorage.getItem(KEY);
    if (current) setStatus(`Şu an impersonate aktif: ${current}`);
  }

  // Boot
  if (!initFromQuery()) {
    wireUI();
  }
})();
