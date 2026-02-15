# DEVELOPMENT

## Gereksinimler
- Node.js 18+
- npm 9+
- Windows uyumlu komutlar (`npm run ...`) kullanılır.

## Kurulum
```bash
npm install
```

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
