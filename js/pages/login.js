// js/pages/login.js
import { login, requireAuth } from "../lib/auth.js";

function $(id) {
  return document.getElementById(id);
}

function showError(msg) {
  const el = $("mvp-login-error");
  if (!el) return;
  el.textContent = msg || "";
  el.hidden = !msg;
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function redirectAfterLogin(session) {
  // Admin -> admin panel
  if (session?.isAdmin || session?.role === "admin") {
    window.location.href = "../dashboard/admin.html";
    return;
  }

  // Member -> projects list
  window.location.href = "../dashboard/index.html";
}

async function init() {
  const form = $("mvp-login-form");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const fromLogout = params.get("loggedOut") === "1";

  // Logout'tan geldiysek otomatik yönlendirme yapma.
  // Kullanıcı login ekranını görsün.
  if (!fromLogout) {
    try {
      const existing = await requireAuth();
      if (existing) {
        redirectAfterLogin(existing);
        return;
      }
    } catch {
      // login değilse devam
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");

    const email = normalizeEmail($("email")?.value);
    const password = $("password")?.value || "";

    if (!email || !password) {
      showError("E-posta ve şifre zorunlu.");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn?.textContent || "Giriş Yap";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Giriş yapılıyor...";
    }

    const result = await login(email, password);

    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }

    if (!result?.ok) {
      showError(result?.message || "Giriş yapılamadı.");
      return;
    }

    // Giriş başarılı -> session bilgisini auth üzerinden çekip yönlendir
    const session = await requireAuth();
    redirectAfterLogin(session);
  });
}

init();
