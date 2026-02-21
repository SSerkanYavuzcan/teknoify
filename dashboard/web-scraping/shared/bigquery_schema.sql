-- ============================================================
-- Teknoify Web-Scraping Platform — BigQuery Schema (FINAL)
-- Dataset: teknoify_scraping
-- Amaç: Multi-tenant (çok müşterili) + Master Product + Store SKU Mapping + Daily Scrape + Matching + Comparison
--
-- Maliyet sıfırlamak için kritik kurallar:
--   ✅ CSV yükleme → BATCH LOAD kullan (streaming değil)
--   ✅ DATE partitioning → sadece ilgili günü tara
--   ✅ CLUSTER BY → sorgularda otomatik optimizasyon
--   ❌ Streaming insert (INSERT INTO) kullanma → ücretli
-- ============================================================

-- ============================================================
-- TABLO 1: price_comparisons  (MEVCUT + GENİŞLETİLMİŞ)
-- Ana raporlama/karşılaştırma tablosu.
-- Her satır = 1 ürün × 1 rakip × 1 tarih (müşteri/proje bazlı).
--
-- NOT: Bu tablo hali hazırda varsa aşağıdaki CREATE dokunmaz.
--      Yeni alanlar için aşağıda ALTER TABLE ADD COLUMN blokları var.
-- ============================================================

CREATE TABLE IF NOT EXISTS `teknoify_scraping.price_comparisons`
(
  -- ── METAVERİ ─────────────────────────────────────────────
  customer_id       STRING  NOT NULL OPTIONS(description='Müşteri benzersiz ID (Firestore UID)'),
  project_id        STRING  NOT NULL OPTIONS(description='Proje: quickcommerce | food | clothes | ...'),
  upload_batch_id   STRING           OPTIONS(description='Yükleme grubu ID — aynı anda yüklenen dosyaları gruplar'),
  uploaded_at       TIMESTAMP        OPTIONS(description='Bu kaydın BigQuery tarafından alındığı zaman'),

  -- ── ZAMAN ────────────────────────────────────────────────
  report_date       DATE    NOT NULL OPTIONS(description='Scraping yapılan gün (YYYY-MM-DD)'),

  -- ── ÜRÜN BİLGİSİ ─────────────────────────────────────────
  store_name        STRING           OPTIONS(description='Müşterinin kendi mağaza adı'),
  product_name      STRING  NOT NULL OPTIONS(description='Ürün adı'),
  sku               STRING           OPTIONS(description='Stok kodu'),
  brand_name        STRING           OPTIONS(description='Marka'),
  category_l1       STRING           OPTIONS(description='Ana kategori (ör: Gıda)'),
  category_l2       STRING           OPTIONS(description='Alt kategori (ör: Taze Meyve)'),

  -- ── KENDİ FİYATLARI ──────────────────────────────────────
  our_original_price  NUMERIC        OPTIONS(description='Müşterinin liste fiyatı'),
  our_discount_price  NUMERIC        OPTIONS(description='Müşterinin indirimli fiyatı (yoksa NULL)'),

  -- ── RAKİP BİLGİSİ ────────────────────────────────────────
  competitor_name           STRING   OPTIONS(description='Rakip mağaza adı'),
  competitor_original_price NUMERIC  OPTIONS(description='Rakip liste fiyatı'),
  competitor_discount_price NUMERIC  OPTIONS(description='Rakip indirimli fiyatı (yoksa NULL)')
)
PARTITION BY report_date
CLUSTER BY customer_id, project_id
OPTIONS(
  description = 'Ana fiyat karşılaştırma tablosu. Batch CSV yüklemeleriyle beslenir. Streaming insert KULLANMA.',
  require_partition_filter = FALSE
);

-- ============================================================
-- price_comparisons'a EK SÜTUNLAR (Master Product + Store + Location + Unit + Matching + Ops/Debug)
-- Mevcut tabloya geriye dönük uyumlu şekilde eklenir.
-- ============================================================

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS master_product_code STRING
OPTIONS(description='Master ürün kodu (tekilleştirme). Migros/Carrefour SKU’ları bu koda bağlanır');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS store_id STRING
OPTIONS(description='Kaynak mağaza/kanal kimliği (ör: migros, carrefour). store_name değişebilir, store_id stabil olmalı');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS competitor_store_id STRING
OPTIONS(description='Rakip mağaza kimliği (ör: migros, carrefour). competitor_name değişebilir');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS city STRING
OPTIONS(description='Şehir');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS district_group STRING
OPTIONS(description='İlçe grubu (senin segment/gruplama mantığı)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS district STRING
OPTIONS(description='İlçe');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS category_l3 STRING
OPTIONS(description='Kategori level 3');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS category_l4 STRING
OPTIONS(description='Kategori level 4');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS uom STRING
OPTIONS(description='Unit of measure (g, kg, ml, l, pcs vb.)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS unit_count FLOAT64
OPTIONS(description='Paket içi adet (6’lı gibi) veya birim sayısı');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS package_size FLOAT64
OPTIONS(description='Paket gramaj/hacim değeri (ör 500)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS package_size_uom STRING
OPTIONS(description='Paket gramaj/hacim birimi (g, ml, kg, l)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS our_source_url STRING
OPTIONS(description='Müşteri ürün sayfası linki (kanıt/debug)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS competitor_source_url STRING
OPTIONS(description='Rakip ürün sayfası linki (kanıt/debug)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS run_id STRING
OPTIONS(description='Günlük scraping run kimliği (aynı gün birden fazla run olabilir)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP
OPTIONS(description='Fiyatın siteden okunduğu an');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP
OPTIONS(description='Sisteme yazıldığı an (pipeline time)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS match_type STRING
OPTIONS(description='Eşleşme tipi: manual | exact | fuzzy | rules');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS match_confidence FLOAT64
OPTIONS(description='Eşleşme güven skoru (0-1 arası)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS status STRING
OPTIONS(description='success | failed | partial (satır bazında kalite/debug)');

ALTER TABLE `teknoify_scraping.price_comparisons`
ADD COLUMN IF NOT EXISTS error_reason STRING
OPTIONS(description='Hata sebebi: parse_error | not_found | blocked | mapping_missing | ...');

-- ============================================================
-- TABLO 2: customers (MEVCUT)
-- ============================================================

CREATE TABLE IF NOT EXISTS `teknoify_scraping.customers`
(
  customer_id    STRING    NOT NULL OPTIONS(description='Firestore kullanıcı UID'),
  company_name   STRING    NOT NULL OPTIONS(description='Şirket/müşteri adı (ör: Tazeyo)'),
  contact_email  STRING             OPTIONS(description='İletişim e-postası'),
  store_label    STRING             OPTIONS(description='Dashboard ve raporlarda gösterilecek mağaza etiketi'),
  created_at     TIMESTAMP NOT NULL OPTIONS(description='Kayıt oluşturulma zamanı'),
  is_active      BOOL      NOT NULL DEFAULT TRUE OPTIONS(description='Hesap aktif mi?')
)
OPTIONS(description='Teknoify müşteri kayıtları. Tek kaynak olarak Firestore kullanılıyorsa bu tablo opsiyoneldir.');

-- ============================================================
-- TABLO 3: project_access (MEVCUT)
-- ============================================================

CREATE TABLE IF NOT EXISTS `teknoify_scraping.project_access`
(
  customer_id    STRING    NOT NULL OPTIONS(description='Firestore kullanıcı UID'),
  project_id     STRING    NOT NULL OPTIONS(description='Projeye özgü tanımlayıcı — price_comparisons.project_id ile eşleşir'),
  project_type   STRING    NOT NULL OPTIONS(description='Proje kategorisi: quickcommerce | food | clothes | custom'),
  project_label  STRING             OPTIONS(description='Kullanıcıya gösterilecek proje adı'),
  granted_at     TIMESTAMP NOT NULL OPTIONS(description='Erişim verilme zamanı'),
  expires_at     TIMESTAMP          OPTIONS(description='Erişim bitiş tarihi — NULL = sınırsız')
)
OPTIONS(description='Müşteri → proje erişim tablosu. Firestore entitlements ile paralel gider.');

-- ============================================================
-- TABLO 4: upload_log (MEVCUT + küçük genişletme önerisi)
-- ============================================================

CREATE TABLE IF NOT EXISTS `teknoify_scraping.upload_log`
(
  upload_batch_id  STRING    NOT NULL OPTIONS(description='UUID — price_comparisons.upload_batch_id ile eşleşir'),
  customer_id      STRING    NOT NULL,
  project_id       STRING    NOT NULL,
  source_file_name STRING             OPTIONS(description='Yüklenen orijinal CSV dosya adı'),
  row_count        INT64              OPTIONS(description='Yüklenen satır sayısı'),
  report_date_min  DATE               OPTIONS(description='Yüklenen verinin en erken tarihi'),
  report_date_max  DATE               OPTIONS(description='Yüklenen verinin en geç tarihi'),
  status           STRING             OPTIONS(description='SUCCESS | FAILED | PARTIAL'),
  error_message    STRING             OPTIONS(description='Hata varsa detayı'),
  created_at       TIMESTAMP NOT NULL OPTIONS(description='Yükleme zamanı')
)
OPTIONS(description='CSV yükleme audit logu.');

-- upload_log'a opsiyonel ama çok faydalı alanlar (geriye dönük uyumlu)
ALTER TABLE `teknoify_scraping.upload_log`
ADD COLUMN IF NOT EXISTS rows_inserted INT64 OPTIONS(description='Başarıyla eklenen satır sayısı');

ALTER TABLE `teknoify_scraping.upload_log`
ADD COLUMN IF NOT EXISTS rows_failed INT64 OPTIONS(description='Hatalı satır sayısı');

ALTER TABLE `teknoify_scraping.upload_log`
ADD COLUMN IF NOT EXISTS schema_version STRING OPTIONS(description='Şema versiyonu (ileride şema evrilince hayat kurtarır)');

-- ============================================================
-- YENİ TABLO: master_products  (Master Product Data)
-- Master ürün tanımı: master_product_code merkezli
-- ============================================================

CREATE TABLE IF NOT EXISTS `teknoify_scraping.master_products`
(
  master_product_code STRING NOT NULL OPTIONS(description='Master ürün benzersiz kodu'),
  master_product_name STRING          OPTIONS(description='Master ürün adı (standartlaştırılmış)'),
  brand_name          STRING          OPTIONS(description='Master marka'),
  category_l1         STRING,
  category_l2         STRING,
  category_l3         STRING,
  category_l4         STRING,

  uom                STRING          OPTIONS(description='g, kg, ml, l, pcs'),
  unit_count         FLOAT64         OPTIONS(description='Paket içi adet / birim sayısı'),
  package_size       FLOAT64         OPTIONS(description='Gramaj/hacim değeri'),
  package_size_uom   STRING          OPTIONS(description='g, ml, kg, l'),

  is_active          BOOL DEFAULT TRUE,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at         TIMESTAMP
)
PARTITION BY DATE(created_at)
CLUSTER BY master_product_code
OPTIONS(description='Master ürün tablosu. SKU eşleştirme ve raporlama bunun üzerinden standardize edilir.');

-- ============================================================
-- YENİ TABLO: store_product_map (Migros/Carrefour SKU -> Master Product)
-- ============================================================

CREATE TABLE IF NOT EXISTS `teknoify_scraping.store_product_map`
(
  store_id            STRING NOT NULL OPTIONS(description='migros | carrefour | ...'),
  store_sku           STRING NOT NULL OPTIONS(description='Store’un kendi SKU kodu'),
  master_product_code STRING NOT NULL OPTIONS(description='Eşlenen master ürün kodu'),

  store_product_name  STRING          OPTIONS(description='Store ürün adı (ham)'),
  store_brand_name    STRING,
  store_category_l1   STRING,
  store_category_l2   STRING,
  store_category_l3   STRING,
  store_category_l4   STRING,

  match_type          STRING          OPTIONS(description='manual | exact | fuzzy | rules'),
  match_confidence    FLOAT64         OPTIONS(description='0-1 arası'),
  source_url          STRING          OPTIONS(description='Eşlemenin kaynağı/kanıtı'),

  is_active           BOOL DEFAULT TRUE,
  valid_from          DATE,
  valid_to            DATE,

  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at          TIMESTAMP
)
PARTITION BY DATE(created_at)
CLUSTER BY store_id, store_sku, master_product_code
OPTIONS(description='Store SKU eşleme tablosu. Daily scrape verisi buraya joinlenerek master_product_code bulunur.');

-- ============================================================
-- YENİ TABLO: store_scrape_daily (RAW günlük veriler)
-- Günlük çalışan scraping job buraya batch load ile yazar (GCS->BQ load).
-- ============================================================

CREATE TABLE IF NOT EXISTS `teknoify_scraping.store_scrape_daily`
(
  report_date       DATE   NOT NULL OPTIONS(description='Partition key: scraping günü'),
  run_id            STRING NOT NULL OPTIONS(description='Run kimliği (aynı gün birden fazla run olabilir)'),

  scraped_at        TIMESTAMP        OPTIONS(description='Siteden okunduğu an'),
  ingested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP() OPTIONS(description='BigQuery’ye yazıldığı an'),

  store_id          STRING NOT NULL OPTIONS(description='migros | carrefour | ...'),
  store_name        STRING          OPTIONS(description='Görünen mağaza adı (değişebilir)'),

  city              STRING,
  district_group    STRING,
  district           STRING,

  store_sku         STRING          OPTIONS(description='Store SKU'),
  product_name      STRING          OPTIONS(description='Ham ürün adı'),
  brand_name        STRING,

  category_l1       STRING,
  category_l2       STRING,
  category_l3       STRING,
  category_l4       STRING,

  price             NUMERIC,
  currency          STRING          OPTIONS(description='TRY, EUR, ...'),

  uom               STRING,
  unit_count        FLOAT64,
  package_size      FLOAT64,
  package_size_uom  STRING,

  source_url        STRING,

  status            STRING          OPTIONS(description='success | failed | partial'),
  error_reason      STRING          OPTIONS(description='parse_error | blocked | not_found | ...')
)
PARTITION BY report_date
CLUSTER BY store_id, city, district_group, district, store_sku
OPTIONS(description='Günlük ham scraping verisi. Matching pipeline buradan beslenir.');

-- ============================================================
-- YENİ TABLO: matched_prices_daily (RAW + MAP join sonucu)
-- store_scrape_daily + store_product_map joininden çıkan sonuçlar.
-- ============================================================

CREATE TABLE IF NOT EXISTS `teknoify_scraping.matched_prices_daily`
(
  report_date        DATE   NOT NULL,
  run_id             STRING NOT NULL,

  store_id           STRING NOT NULL,
  store_sku          STRING NOT NULL,
  master_product_code STRING NOT NULL,

  city               STRING,
  district_group     STRING,
  district           STRING,

  product_name       STRING,
  brand_name         STRING,

  category_l1        STRING,
  category_l2        STRING,
  category_l3        STRING,
  category_l4        STRING,

  price              NUMERIC,
  currency           STRING,

  uom                STRING,
  unit_count         FLOAT64,
  package_size       FLOAT64,
  package_size_uom   STRING,

  source_url         STRING,

  match_type         STRING,
  match_confidence   FLOAT64,

  scraped_at         TIMESTAMP,
  ingested_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY report_date
CLUSTER BY master_product_code, store_id, city, district_group, district
OPTIONS(description='Eşleşmiş günlük fiyat tablosu. Raporlama ve comparison için en sağlıklı kaynak.');

-- ============================================================
-- VIEW: vw_latest_comparison (GÜNCEL)
-- customers join + (opsiyonel) master info’yu ileride buradan da alabiliriz
-- ============================================================

CREATE OR REPLACE VIEW `teknoify_scraping.vw_latest_comparison` AS
SELECT
  pc.*,
  c.store_label,
  c.company_name
FROM `teknoify_scraping.price_comparisons` pc
LEFT JOIN `teknoify_scraping.customers` c USING (customer_id);

-- ============================================================
-- VIEW: vw_matched_latest (dedupe)
-- Aynı gün/sku/master için en güncel ingest edilen satırı getirir
-- ============================================================

CREATE OR REPLACE VIEW `teknoify_scraping.vw_matched_latest` AS
SELECT * EXCEPT(rn)
FROM (
  SELECT
    mpd.*,
    ROW_NUMBER() OVER (
      PARTITION BY report_date, store_id, store_sku, master_product_code, city, district_group, district
      ORDER BY ingested_at DESC
    ) AS rn
  FROM `teknoify_scraping.matched_prices_daily` mpd
)
WHERE rn = 1;
