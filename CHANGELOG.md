# CHANGELOG

## Refactor - Front-end maintainability baseline

### Added
- `ARCHITECTURE.md` (audit, hedef klasörleme, konvansiyonlar).
- `DEVELOPMENT.md` (kurulum, kalite komutları, deploy notları).
- `.editorconfig`.
- Prettier + ESLint + Stylelint yapılandırmaları.
- NPM scriptleri (`format`, `lint:*`, `check`).

### Changed
- `css/style.css` artık katmanlı import manifest dosyası olarak çalışıyor.
- Büyük stil bloğu şu modüllere bölündü:
  - `css/00-settings/tokens.css`
  - `css/02-generic/base.css`
  - `css/03-elements/forms-buttons.css`
  - `css/04-objects/layout.css`
  - `css/05-components/hero-services.css`
  - `css/05-components/contact-modal.css`
  - `css/05-components/footer.css`
  - `css/06-pages/home.css`

### Migration notes
- HTML dosyalarında `css/style.css` referansı aynı kalır; ek değişiklik gerekmez.
- Görsel/işlevsel çıktıyı korumak için selector isimleri korunmuştur.
