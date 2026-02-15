import { login } from "../lib/auth.js";

function $(id) {
  return document.getElementById(id);
}

function showError(msg) {
  const el = $("mvp-login-error");
  if (!el) return;
  el.textContent = msg;
  el.hidden = !msg;
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function redirectAfterLogin(session) {
  // login sayfası /pages/ altında: dashboard'a ../dashboard/...
  if (session?.role === "admin") {
    window.location.href = "../dashboard/admin.html";
    return;
  }
  window.location.href = "../dashboard/member.html";
}

function init() {
  const form = $("mvp-login-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showError("");

    const email = normalizeEmail($("email")?.value);
    const password = $("password")?.value || "";

    const result = login(email, password);
    if (!result?.ok) {
      showError(result?.message || "Giriş yapılamadı.");
      return;
    }

    redirectAfterLogin(result.session);
  });
}

init();
