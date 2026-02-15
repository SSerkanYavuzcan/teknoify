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

## MVP Auth + Entitlements + Admin Management (Prototype)
- Bu MVP tamamen **localStorage + JSON seed** ile çalışır, backend yoktur.
- Admin panelinde kullanıcı/proje oluşturma-düzenleme-devre dışı bırakma/silme işlemleri localStorage'a yazılır.
- Önerilen kullanım: statik server üzerinden çalıştırın (örn. VS Code Live Server) ve `pages/login.html` sayfasını açın.
- Demo kullanıcılar:
  - Admin: `admin@teknoify.local` / `admin123`
  - User: `user@teknoify.local` / `user123`
- Güvenlik notu: Bu yapı prototip amaçlıdır. Şifreler düz metin mock veridir ve **production için güvenli değildir**.

### Hızlı test akışı
1. Admin panelindeki **Reset Data** butonu ile temiz başlangıç yapın (veya localStorage temizleyin).
2. `admin@teknoify.local` ile giriş yapıp Admin paneline geçin.
3. Users sekmesinden yeni kullanıcı oluşturun.
4. Projects sekmesinden yeni proje oluşturun.
5. Access sekmesinden kullanıcıya proje erişimi verip kaydedin.
6. Çıkış yapıp yeni kullanıcı ile giriş yapın; dashboard'da sadece yetkili projeleri görün.
7. Kullanıcıyı disable edip tekrar login deneyin; girişin engellendiğini doğrulayın.

### Temiz başlangıç için localStorage anahtarları
- `teknoify_users`
- `teknoify_projects`
- `teknoify_entitlements`
- `teknoify_session`
- `teknoify_seeded_v1`

## Navigation + Guard Davranışı (MVP)
- Tüm MVP sayfalarında (`pages/login.html`, `dashboard/index.html`, `dashboard/admin.html`, `pages/unauthorized.html`) ortak role-aware nav JS ile render edilir.
- Guard kuralları:
  - Dashboard: login zorunlu
  - Admin: login + admin rolü zorunlu
- Girişsiz erişimde kullanıcı login sayfasına `?return=...` parametresiyle yönlendirilir.
- Login sonrası mümkünse `return` hedefi açılır; yoksa dashboard açılır.
- Admin yetkisi olmayan kullanıcı Admin sayfasına giderse `pages/unauthorized.html` sayfasına yönlendirilir.


## Admin Impersonation (View as User)
- Admin panelindeki **View as** butonu ile kullanıcı şifresi bilmeden o kullanıcı gibi görüntüleme yapılabilir.
- Başlatıldığında:
  - `teknoify_impersonation` yazılır (`adminUserId`, `targetUserId`, `startedAt`, admin session backup)
  - `teknoify_session` hedef kullanıcı oturumu olarak güncellenir.
- Tüm kullanıcı sayfalarında üstte kırmızı bir banner görünür: **Viewing as ...**
  - Tek tıkla **Return to Admin** ile admin oturumu geri yüklenir.
- Not: Bu özellik de MVP/localStorage prototipidir.

## Conflict-free recreation note
- Bu güncelleme, web editörde çözülemeyen conflict durumunu önlemek için temiz bir branch üzerinde yeniden uygulanmıştır.
- Kapsam sadece paylaşılan nav stili ve ilgili sayfa-partial CSS düzenlerini içerir; davranış değişikliği hedeflenmemiştir.
