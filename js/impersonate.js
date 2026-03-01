/* global window, document */

(() => {
  const IMP_EMAIL_KEY = "impersonated_user_key";
  const IMP_ID_KEY = "impersonated_user_id"; 
  // const USERS_KEY = "teknoify_users"; // Güvenlik sebebiyle iptal edildi
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

  // DİKKAT: İlerleyen aşamalarda bu local storage session kontrolünü de 
  // Firebase Auth (Custom Claims) ile değiştirmemiz güvenliği arşa çıkaracaktır.
  function requireAdminSessionOrRedirect() {
    const sessionRaw = window.localStorage.getItem(SESSION_KEY);
    const session = safeJSONParse(sessionRaw, null);

    if (!session || session.role !== "admin") {
      window.location.assign("/pages/login.html");
      return null;
    }
    return session;
  }

  async function ensureUsersLoaded() {
    // GÜVENLİK GÜNCELLEMESİ: users.json dosyası silindiği için veriler artık 
    // Firebase Firestore'dan (veya backend API'nizden) çekilmelidir.
    
    try {
      // TODO: Firebase veritabanı bağlantınızı buraya yapın.
      // Örnek Firestore kullanımı:
      // const snapshot = await firebase.firestore().collection('users').get();
      // const users = snapshot.docs.map(doc => doc.data());
      // return users;

      console.warn("Kullanıcı listesi artık Firebase'den çekilmeli! Şimdilik boş liste dönüyor.");
      return []; 
    } catch (error) {
      console.error("Kullanıcı listesi çekilemedi:", error);
      return [];
    }
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
      : "Kullanıcı bulunamadı (Firebase'den çekilmeli)";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    nonAdminUsers.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u.id; // select value userId
      opt.textContent = `${u.name || 'İsimsiz'} (${u.email})`;
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

    const dest = targetPath ||
