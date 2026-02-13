# ARCHITECTURE

## 1) Mevcut Durum Özeti (Audit)
- Sayfalar: `index.html`, `reset-password.html`, `pages/*`, `dashboard/*`.
- Büyük dosyalar: `dashboard/analysis.html` (~1341 satır), `css/style.css` (~984 satır), `index.html` (~853 satır), `js/script.js` (~556 satır).
- Tekrar eden bloklar:
  - `pages/*` içinde header/footer/login-modal tekrar ediyor.
  - Ortak stiller çoğunlukla `css/style.css` içinde toplanmış.
  - Ortak UI + auth davranışı `js/script.js` içinde birlikte yer alıyor.

## 2) Hedef Mimari (No-build, statik hosting uyumlu)
Bu repo için **build zorunluluğu olmadan** ölçeklenebilir bir MPA yaklaşımı uygulanır:

```text
.
├─ css/
│  ├─ 00-settings/      # tokenlar (renk, spacing, tipografi değişkenleri)
│  ├─ 02-generic/       # reset/base/global davranış
│  ├─ 03-elements/      # buton, form, link gibi element temelleri
│  ├─ 04-objects/       # layout primitive'leri
│  ├─ 05-components/    # component stilleri
│  ├─ 06-pages/         # sayfa özel stiller
│  └─ style.css         # yalnızca import manifest
├─ js/
│  ├─ script.js         # mevcut global orchestrator (geriye uyumluluk)
│  ├─ cookies.js
│  └─ session-manager.js
├─ pages/
├─ dashboard/
├─ components/          # tekrar kullanılacak HTML parçaları için ayrılmış alan
├─ docs
│  ├─ ARCHITECTURE.md
│  ├─ DEVELOPMENT.md
│  └─ CHANGELOG.md
└─ (root html dosyaları)
```

## 3) Konvansiyonlar
- CSS katmanları numerik prefix ile sıralanır (`00..06`).
- `style.css` yalnızca `@import` içerir; doğrudan stil yazılmaz.
- Component bazlı stil dosyaları `kebab-case` kullanır.
- Yeni sayfa için sayfa-özel stil yalnızca `css/06-pages/` altında tutulur.

## 4) Yeni sayfa ekleme
1. HTML dosyasını uygun klasöre ekleyin (`/pages` veya root).
2. Ortak stil için `css/style.css` linki ekleyin.
3. Eğer sayfaya özel stil gerekiyorsa `css/06-pages/<page>.css` oluşturun ve ilgili sayfada ayrıca linkleyin.
4. Ortak JS için `js/script.js`; sayfaya özel JS için ayrı dosya oluşturup sadece o sayfada include edin.

## 5) Yeni component ekleme
1. HTML parçasını `components/` altına ekleyin.
2. Stilini `css/05-components/` altına taşıyın.
3. Gerekirse ortak davranışı `js/` altındaki ayrı bir modülde tutun.
4. Kullanıldığı tüm sayfalarda aynı markup + class adlarını koruyun.

## 6) Ölçeklenebilirlik notları
- `dashboard/analysis.html` gibi büyük dosyalar sonraki adımda bölüm bazlı parçalanmalıdır (ör. `components/dashboard/analysis/*`).
- `js/script.js` sonraki aşamada `js/modules/*` altına (auth/ui/contact/effects) ayrılmalıdır.
