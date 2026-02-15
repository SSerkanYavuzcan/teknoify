# DEVELOPMENT

## Gereksinimler
- Node.js 18+
- npm 9+
- Windows uyumlu komutlar (`npm run ...`) kullanılır.

## Kurulum
```bash
npm install
```

Kurulumdan sonra `npm run check` çalıştırın.
## Kod kalitesi komutları
```bash
npm run format
npm run format:check
npm run lint:js
npm run lint:css
npm run check
```

## Lokal çalışma
Bu proje statik MPA yapısındadır. Dosyalar doğrudan host edilebilir.
Geliştirme sırasında bir static server önerilir (ör. VS Code Live Server).

## Deploy
- Mevcut route/filename yapısı korunmuştur.
- `index.html`, `reset-password.html`, `pages/*`, `dashboard/*` doğrudan yayınlanabilir.

## Bakım kuralları
- Yeni CSS doğrudan `css/style.css` içine yazılmaz; ilgili katman dosyasına eklenir.
- Lint ve format kontrolleri commit öncesi çalıştırılır.

## MVP Auth + Entitlements (Prototype)
- Bu MVP tamamen **localStorage + JSON seed** ile çalışır, backend yoktur.
- Önerilen kullanım: statik server üzerinden çalıştırın (örn. VS Code Live Server) ve `pages/login.html` sayfasını açın.
- Demo kullanıcılar:
  - Admin: `admin@teknoify.local` / `admin123`
  - User: `user@teknoify.local` / `user123`
- Güvenlik notu: Bu yapı prototip amaçlıdır. Şifreler düz metin mock veridir ve **production için güvenli değildir**.
- Temiz başlangıç için tarayıcı localStorage anahtarlarını temizleyin:
  - `teknoify_users`
  - `teknoify_projects`
  - `teknoify_entitlements`
  - `teknoify_session`
  - `teknoify_seeded_v1`
