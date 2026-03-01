const STORAGE_KEYS = {
  // users: 'teknoify_users', // Güvenlik sebebiyle tamamen kaldırıldı, Firebase yönetiyor.
  projects: 'teknoify_projects',
  entitlements: 'teknoify_entitlements',
  seeded: 'teknoify_seeded_v2' // Tarayıcı önbelleğini kırmak ve eski şifreli verileri ezmek için v2 yaptık
};

const EMBEDDED_SEED = {
  // KULLANICILAR VE ŞİFRELER BURADAN TAMAMEN SİLİNDİ! 🚀
  
  projects: [
    {
      id: 'pim_automation',
      name: 'PIM Automation',
      description: 'Ürün bilgi yönetimi süreçlerini otomatikleştirerek katalog operasyonlarını hızlandırır.',
      demoUrl: 'pages/api.html',
      status: 'active'
    },
    {
      id: 'banner_rpa',
      name: 'Banner Automation',
      description: 'Kampanya banner üretimi ve güncellemelerini otomatikleştirir.',
      demoUrl: 'pages/rpa.html',
      status: 'active'
    }
  ],
  // Not: Eğer yetkileri de tamamen Firebase'e (Firestore) taşıdıysan burayı da ileride uçuracağız.
  entitlements: [{ userId: 'u_serkan', projectIds: ['pim_automation'] }]
};

export function getJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function loadSeedWithFallback(filename, fallback) {
  try {
    const response = await fetch(`../data/${filename}`);
    if (!response.ok) {
      throw new Error(`Seed load failed: ${filename}`);
    }
    return await response.json();
  } catch {
    try {
      const response = await fetch(`data/${filename}`);
      if (!response.ok) {
        throw new Error(`Seed load failed: ${filename}`);
      }
      return await response.json();
    } catch {
      return fallback;
    }
  }
}

export async function initSeedDataOnce() {
  if (window.localStorage.getItem(STORAGE_KEYS.seeded) === 'true') {
    return;
  }

  // SADECE projeler ve yetkiler (entitlements) yükleniyor. Users JSON araması iptal!
  const [projects, entitlements] = await Promise.all([
    loadSeedWithFallback('projects.json', EMBEDDED_SEED.projects),
    loadSeedWithFallback('entitlements.json', EMBEDDED_SEED.entitlements)
  ]);

  if (!window.localStorage.getItem(STORAGE_KEYS.projects)) {
    setJSON(STORAGE_KEYS.projects, projects);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.entitlements)) {
    setJSON(STORAGE_KEYS.entitlements, entitlements);
  }

  // Tarayıcıdaki eski güvensiz users datasını temizleyelim (Garanti olsun)
  window.localStorage.removeItem('teknoify_users');
  window.localStorage.setItem(STORAGE_KEYS.seeded, 'true');
}

export { STORAGE_KEYS };
