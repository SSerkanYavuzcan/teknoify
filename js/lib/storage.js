const STORAGE_KEYS = {
  users: 'teknoify_users',
  projects: 'teknoify_projects',
  entitlements: 'teknoify_entitlements',
  seeded: 'teknoify_seeded_v1'
};

const EMBEDDED_SEED = {
  users: [
    {
      id: 'u_admin',
      email: 'admin@teknoify.local',
      name: 'Admin',
      role: 'admin',
      password: 'admin123'
    },
    {
      id: 'u_serkan',
      email: 'user@teknoify.local',
      name: 'User',
      role: 'user',
      password: 'user123'
    }
  ],
  projects: [
    {
      id: 'pim_automation',
      name: 'PIM Automation',
      description:
        'Ürün bilgi yönetimi süreçlerini otomatikleştirerek katalog operasyonlarını hızlandırır.',
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

  const [users, projects, entitlements] = await Promise.all([
    loadSeedWithFallback('users.json', EMBEDDED_SEED.users),
    loadSeedWithFallback('projects.json', EMBEDDED_SEED.projects),
    loadSeedWithFallback('entitlements.json', EMBEDDED_SEED.entitlements)
  ]);

  if (!window.localStorage.getItem(STORAGE_KEYS.users)) {
    setJSON(STORAGE_KEYS.users, users);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.projects)) {
    setJSON(STORAGE_KEYS.projects, projects);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.entitlements)) {
    setJSON(STORAGE_KEYS.entitlements, entitlements);
  }

  window.localStorage.setItem(STORAGE_KEYS.seeded, 'true');
}

export { STORAGE_KEYS };
