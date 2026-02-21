/**
 * shared/auth.js
 * Firebase Auth + RBAC bootstrapper.
 * Reads PROJECT_CONFIG (must be loaded before this script).
 */

const _FIREBASE_CONFIG = {
  apiKey: "AIzaSyC1Id7kdU23_A7fEO1eDna0HKprvIM30E8",
  authDomain: "teknoify-9449c.firebaseapp.com",
  projectId: "teknoify-9449c",
  storageBucket: "teknoify-9449c.firebasestorage.app",
  messagingSenderId: "704314596026",
  appId: "1:704314596026:web:f63fff04c00b7a698ac083",
  measurementId: "G-1DZKJE7BXE"
};

if (!firebase.apps.length) firebase.initializeApp(_FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeLower(s) { return String(s || '').trim().toLowerCase(); }

function toggleSidebar() { document.body.classList.toggle('sidebar-closed'); }

// ─── Firestore helpers ────────────────────────────────────────────────────────
async function ensureUserProfile(user) {
  const uid = user.uid;
  const email = safeLower(user.email);
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data() || {};
    if (!data.email && email) {
      await ref.set({ email }, { merge: true });
      return { ...data, email };
    }
    return data;
  }

  const fallbackName = user.displayName || (email ? email.split('@')[0] : 'User');
  const profile = {
    uid, email,
    name: fallbackName,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await ref.set(profile, { merge: true });
  return profile;
}

async function isAdmin(uid) {
  const snap = await db.collection('admins').doc(uid).get();
  return snap.exists === true;
}

async function hasEntitlement(uid, projectId) {
  const snap = await db.collection('entitlements').doc(uid).get();
  if (!snap.exists) return { entitled: false, allowedStores: [] };
  const data = snap.data() || {};
  const ids = Array.isArray(data.projectIds) ? data.projectIds : [];
  const entitled = ids.includes(projectId);

  const projectStores = data.projectStores || data.projectStoreAccess || {};
  const storesByProject = Array.isArray(projectStores?.[projectId]) ? projectStores[projectId] : [];
  const globalStores = Array.isArray(data.allowedStores) ? data.allowedStores : [];
  const allowedStores = (storesByProject.length ? storesByProject : globalStores)
    .map((store) => String(store || '').trim())
    .filter(Boolean);

  return { entitled, allowedStores };
}

function applyUserUI(profile, firebaseUser) {
  const email = safeLower(firebaseUser.email);
  const displayName =
    profile?.name ||
    firebaseUser.displayName ||
    (email ? email.split('@')[0] : 'User');

  const nameEl = document.getElementById('user-name-display');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl) nameEl.textContent = displayName;
  if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  const cfg = PROJECT_CONFIG;

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = cfg.rootPath + 'pages/login.html';
      return;
    }

    try {
      const uid = user.uid;
      const profile = await ensureUserProfile(user);
      applyUserUI(profile, user);

      const admin = await isAdmin(uid);
      if (!admin) {
        const access = await hasEntitlement(uid, cfg.projectId);
        if (!access.entitled) {
          alert('Bu hizmete erişim yetkiniz bulunmamaktadır.');
          window.location.href = cfg.basePath + 'member.html';
          return;
        }

        window.USER_ALLOWED_STORES = access.allowedStores;
      }

      initCalendar();
      // BigQuery mimarisinde sheetUrl artık kullanılmıyor.
      // Kullanıcı tarih seçip "Verileri Yükle"ye basınca applyFilters() → initData() → API çağrısı yapılır.
    } catch (err) {
      console.error('Bootstrap error:', err);
      const tbody = document.getElementById('table-body');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center;padding:30px;color:#ef4444;">Profil yüklenirken hata oluştu.</td></tr>';
      }
    }
  });

  // Global menu close
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.multi-select-wrapper')) {
      document.querySelectorAll('.multi-select-menu').forEach(m => m.classList.remove('show'));
    }
    const wrapper = document.querySelector('.download-wrapper');
    const menu = document.getElementById('download-menu');
    if (wrapper && menu && !wrapper.contains(e.target)) menu.classList.remove('show');
  });
}

function logout() {
  if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
    auth.signOut().finally(() => {
      window.location.href = PROJECT_CONFIG.rootPath + 'index.html';
    });
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
