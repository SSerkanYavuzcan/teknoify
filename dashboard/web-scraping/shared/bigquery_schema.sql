-- ============================================================
-- Teknoify Web-Scraping Platform — BigQuery Schema
-- Dataset: teknoify_scraping
-- Hedef: Multi-tenant (çok müşterili) fiyat karşılaştırma verisi
--
-- Ücretsiz kota özeti (2024):
--   Depolama : 10 GB/ay ücretsiz
--   Sorgular : 1 TB/ay ücretsiz (on-demand)
--   CSV yükleme: SINIRSIZ ÜCRETSİZ (batch load)
--
-- Maliyet sıfırlamak için kritik kurallar:
--   ✅ CSV yükleme → BATCH LOAD kullan (streaming değil)
--   ✅ DATE partitioning → sadece ilgili günü tara
--   ✅ CLUSTER BY → sorgularda otomatik optimizasyon
--   ❌ Streaming insert (INSERT INTO) kullanma → ücretli
-- ============================================================


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLO 1: price_comparisons
-- Ana veri tablosu. Her satır = 1 ürün × 1 rakip × 1 tarih.
-- CSV yüklemesi buraya yapılır.
--
-- Partition: report_date  → sadece seçilen tarihleri tarar
-- Cluster  : customer_id, project_id → hızlı filtreleme
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  description = 'Ana fiyat karşılaştırma tablosu. Batch CSV yüklemeleriyle beslenir. Hiçbir zaman streaming insert kullanma.',
  require_partition_filter = FALSE  -- Dashboard sorgularında esneklik için
);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLO 2: customers
-- Müşteri kaydı. Firestore UID ile eşleşir.
-- Manuel ya da onboarding şkripiyle doldurulur.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLO 3: project_access
-- Hangi müşteri hangi projeye erişebilir?
-- Firestore'daki entitlements koleksiyonuyla paralel gider.
--
-- Örnek:
--   customer_id = "uid_tazeyo"
--   project_id  = "quickcommerce"
--   project_type= "quickcommerce"
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS `teknoify_scraping.project_access`
(
  customer_id    STRING    NOT NULL OPTIONS(description='Firestore kullanıcı UID'),
  project_id     STRING    NOT NULL OPTIONS(description='Projeye özgü tanımlayıcı — price_comparisons tablosundaki project_id ile eşleşir'),
  project_type   STRING    NOT NULL OPTIONS(description='Proje kategorisi: quickcommerce | food | clothes | custom'),
  project_label  STRING             OPTIONS(description='Kullanıcıya gösterilecek proje adı'),
  granted_at     TIMESTAMP NOT NULL OPTIONS(description='Erişim verilme zamanı'),
  expires_at     TIMESTAMP          OPTIONS(description='Erişim bitiş tarihi — NULL = sınırsız')
)
OPTIONS(description='Müşteri → proje erişim tablosu. Yeni müşteri eklenince buraya ve Firestore entitlements koleksiyonuna yazılır.');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLO 4: upload_log
-- Her CSV yüklemesinin kaydını tutar. Debugging ve audit için.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- YARDIMCI VIEW: vw_latest_comparison
-- Dashboard sorgularında en çok kullanılacak hazır görünüm.
-- Her ürün için en son raporlama gününü getirir.
--
-- Kullanım örneği:
--   SELECT * FROM `teknoify_scraping.vw_latest_comparison`
--   WHERE customer_id = 'uid_tazeyo'
--     AND project_id  = 'quickcommerce'
--     AND report_date BETWEEN '2024-01-15' AND '2024-01-21'
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE VIEW `teknoify_scraping.vw_latest_comparison` AS
SELECT
  pc.*,
  c.store_label,
  c.company_name
FROM `teknoify_scraping.price_comparisons` pc
LEFT JOIN `teknoify_scraping.customers` c USING (customer_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÖRNEK: CSV yükleme komutu (bq CLI)
--
-- bq load \
--   --source_format=CSV \
--   --skip_leading_rows=1 \
--   --allow_quoted_newlines \
--   --replace=false \
--   teknoify_scraping.price_comparisons \
--   gs://teknoify-uploads/quickcommerce/2024-01-21.csv \
--   ./bigquery_schema.json
--
-- NOT: gs:// yerine yerel dosya da kullanılabilir ama
--      GCS kullanımı production için önerilir ve ücretsizdir.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ÖRNEK: Müşteri ve proje ekleme
--
-- INSERT INTO `teknoify_scraping.customers` VALUES (
--   'firebase_uid_buraya',  -- customer_id
--   'Tazeyo',               -- company_name
--   'info@tazeyo.com',      -- contact_email
--   'Tazeyo',               -- store_label (dashboard badge etiketi)
--   CURRENT_TIMESTAMP(),    -- created_at
--   TRUE                    -- is_active
-- );
--
-- INSERT INTO `teknoify_scraping.project_access` VALUES (
--   'firebase_uid_buraya',  -- customer_id
--   'quickcommerce',        -- project_id
--   'quickcommerce',        -- project_type
--   'Quick Commerce Analizi', -- project_label
--   CURRENT_TIMESTAMP(),    -- granted_at
--   NULL                    -- expires_at (sınırsız)
-- );
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
