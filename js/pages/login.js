// /js/pages/login.js

// 1. Modüler sisteme uygun Mutlak Yol importu
import { login, requireAuth } from "/js/lib/auth.js";

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
  // session objesinin Firestore'dan gelen verileri içerdiğini biliyoruz.
  // Diğer dosyalarda kullandığımız isAdmin mantığını burada da kullanıyoruz.
  const isAdmin = session?.isAdmin || session?.realIsAdmin || false; 
  
  // Eğer veritabanında status diye bir alan varsa kontrol et, yoksa aktif say.
  const userStatus = session?.status || session?.role?.status || "active";

  // 1. Eğer hesabı aktif değilse yönlendirmeyi durdur
  if (userStatus !== "active") {
    showError("Hesabınız aktif değil veya askıya alınmış. Lütfen destek ile iletişime geçin.");
    return; 
  }

  // 2. Rol bazlı yönlendirme (isAdmin bayrağına göre)
  if (isAdmin) {
    window.location.href = "/dashboard/admin.html";
  } else {
    // Normal üye ise standart dashboard'a yönlendir
    window.location.href = "/dashboard/member.html"; 
  }
}

async function init() {
  const form = $("mvp-login-form");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const fromLogout = params.get("loggedOut") === "1";

  // Logout'tan geldiysek otomatik yönlendirme yapma. Kullanıcı login ekranını görsün.
  if (!fromLogout) {
    try {
      const existing = await requireAuth();
      if (existing) {
        redirectAfterLogin(existing);
        return;
      }
    } catch {
      // login değilse sessizce devam et
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

    // Auth.js üzerinden Firebase Login işlemini tetikle
    const result = await login(email, password);

    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }

    if (!result?.ok) {
      showError(result?.message || "Giriş yapılamadı.");
      return;
    }

    // Giriş başarılı -> session bilgisini auth üzerinden çekip güvenle yönlendir
    const session = await requireAuth();
    if (session) {
      redirectAfterLogin(session);
    }
  });
}

// Sistemi Başlat
init();
