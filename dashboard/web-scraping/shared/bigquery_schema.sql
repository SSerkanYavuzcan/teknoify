-- ============================================================
-- Teknoify Web-Scraping Platform — BigQuery Schema (FINAL v8)
-- Dataset: teknoify_scraping
-- DEFAULT yok (maksimum uyumluluk)
--
-- Notlar:
-- - Günlük tablolar hafif: vendor_code + lokasyon + sku/barcode + fiyat + kampanya + url + status
-- - Vendor kimliği: her yerde vendor_code
-- ============================================================


-- =========================
-- 1) VENDORS (adres/konum/vendor meta)
-- =========================
CREATE TABLE IF NOT EXISTS `teknoify_scraping.vendors`
(
  vendor_code          STRING NOT NULL OPTIONS(description='Vendor benzersiz kodu. Tüm tablolarda ortak anahtar.'),
  vendor_name          STRING          OPTIONS(description='Görünen mağaza/market adı'),
  vendor_category      STRING          OPTIONS(description='Örn: supermarket, electronics, fashion, ...'),
  vertical             STRING          OPTIONS(description='Örn: shops, food, darkstore, ...'),

  country              STRING,
  city                 STRING,
  district_group       STRING,
  district             STRING,

  address              STRING,
  phone                STRING,

  latitude             FLOAT64 OPTIONS(description='Enlem'),
  longitude            FLOAT64 OPTIONS(description='Boylam'),

  matching_vendors     ARRAY<STRING>   OPTIONS(description='Karşılaştırılması uygun vendor_code listesi. Örn: ["3re3","fe23"]'),

  created_at           TIMESTAMP       OPTIONS(description='Kayıt oluşturma zamanı'),
  updated_at           TIMESTAMP       OPTIONS(description='Son güncelleme zamanı')
)
CLUSTER BY vendor_code
OPTIONS(description='Vendor master tablosu (lokasyon, iletişim, eşleştirilebilir vendorlar).');


-- =========================
-- 2) MASTER PRODUCTS (multi-sector)  (ağır alanlar burada)
-- =========================
CREATE TABLE IF NOT EXISTS `teknoify_scraping.master_products`
(
  country                      STRING          OPTIONS(description='Ülke / menşei'),
  master_product_code           STRING NOT NULL OPTIONS(description='Master ürün benzersiz kodu'),
  master_product_barcodes       ARRAY<STRING>   OPTIONS(description='Birden fazla barkod/GTIN listesi'),

  external_identifiers          ARRAY<STRUCT<
                                 id_type STRING,
                                 id_value STRING
                               >>               OPTIONS(description='Genel kimlikler: MPN/ISBN/ASIN vb.'),

  master_product_name           STRING          OPTIONS(description='Standart ürün adı'),
  master_product_description    STRING          OPTIONS(description='Ürün açıklaması'),
  master_product_type           STRING          OPTIONS(description='Ürün tipi (food, apparel, tech, etc.)'),

  master_product_brand          STRING          OPTIONS(description='Master marka adı'),
  master_brand_owner            STRING          OPTIONS(description='Marka sahibi / private label owner'),

  master_category_level_1       STRING,
  master_category_level_2       STRING,
  master_category_level_3       STRING,

  master_image_urls             ARRAY<STRING>   OPTIONS(description='Ürün görsel URL listesi'),

  -- Variants
  colour_variants               ARRAY<STRING>,
  size_variants                 ARRAY<STRING>,
  fit_type                      STRING,
  variant_attributes            ARRAY<STRUCT<attr STRING, values ARRAY<STRING>>>,

  -- Dimensions & Weight
  master_product_dimensions     STRUCT<height FLOAT64, length FLOAT64, width FLOAT64, unit STRING>,
  weight_value                  FLOAT64,
  weight_unit                   STRING,

  -- Domain-agnostic attributes
  attributes                    ARRAY<STRUCT<key STRING, value STRING, unit STRING>>,

  -- Nutrition (optional)
  nutrition_basis               STRING,
  nutrition                     ARRAY<STRUCT<name STRING, value FLOAT64, unit STRING>>,

  -- Packaging
  uom                           STRING,
  unit_count                    FLOAT64,
  package_size                  FLOAT64,
  package_size_uom              STRING,

  is_active                     BOOL,
  created_at                    TIMESTAMP,
  updated_at                    TIMESTAMP
)
CLUSTER BY master_product_code
OPTIONS(description='Master ürün tablosu (tüm sektörlere uygun, ağır alanlar burada kalır).');


-- =========================
-- 3) STORE PRODUCT MAP
-- =========================
CREATE TABLE IF NOT EXISTS `teknoify_scraping.store_product_map`
(
  competitor_name               STRING NOT NULL OPTIONS(description='migros | carrefour | ...'),
  store_sku                     STRING NOT NULL OPTIONS(description='Rakip platform SKU'),
  store_barcode                 STRING          OPTIONS(description='Rakip barkod/GTIN (opsiyonel)'),
  store_product_name            STRING          OPTIONS(description='Rakipte görünen ürün adı'),

  -- Master (denormalize hızlı kullanım)
  master_product_code           STRING NOT NULL,
  master_product_name           STRING,
  master_product_brand          STRING,
  master_brand_owner            STRING,
  master_category_level_1       STRING,
  master_category_level_2       STRING,
  master_category_level_3       STRING,

  match_type                    STRING,
  match_confidence              FLOAT64,
  source_url                    STRING,

  created_at                    TIMESTAMP,
  updated_at                    TIMESTAMP,
  update_reason                 STRING,
  is_active                     BOOL
)
CLUSTER BY competitor_name, store_sku, master_product_code
OPTIONS(description='Tek mapping tablosu. Eşleşme competitor_name + store_sku ile yapılır.');


-- =========================
-- 4) STORE SCRAPE DAILY (RAW - hafif)
-- =========================
CREATE TABLE IF NOT EXISTS `teknoify_scraping.store_scrape_daily`
(
  report_date                   DATE   NOT NULL,
  run_id                        STRING NOT NULL,

  scraped_at                    TIMESTAMP,
  ingested_at                   TIMESTAMP,

  competitor_name               STRING NOT NULL OPTIONS(description='migros | carrefour | ...'),
  vendor_code                   STRING NOT NULL OPTIONS(description='Taranan mağaza/şube/vendor kodu'),

  country                       STRING,
  city                          STRING,
  district_group                STRING,
  district                      STRING,

  store_sku                     STRING,
  store_barcode                 STRING,

  original_price                NUMERIC,
  discount_price                NUMERIC,
  currency                      STRING,

  source_url                    STRING,

  campaign_name                 STRING,
  campaign_badge                STRING,
  cart_campaign                 STRING,

  status                        STRING,
  error_reason                  STRING
)
PARTITION BY report_date
CLUSTER BY competitor_name, vendor_code, country, city, district_group, district, store_sku
OPTIONS(description='Günlük ham scraping verisi (hafif).');


-- =========================
-- 5) MATCHED PRICES DAILY (hafif)
-- =========================
CREATE TABLE IF NOT EXISTS `teknoify_scraping.matched_prices_daily`
(
  report_date                   DATE   NOT NULL,
  run_id                        STRING NOT NULL,

  competitor_name               STRING NOT NULL,
  vendor_code                   STRING NOT NULL,

  store_sku                     STRING,
  store_barcode                 STRING,

  master_product_code           STRING NOT NULL,

  country                       STRING,
  city                          STRING,
  district_group                STRING,
  district                      STRING,

  original_price                NUMERIC,
  discount_price                NUMERIC,
  currency                      STRING,

  source_url                    STRING,

  campaign_name                 STRING,
  campaign_badge                STRING,
  cart_campaign                 STRING,

  match_type                    STRING,
  match_confidence              FLOAT64,

  scraped_at                    TIMESTAMP,
  ingested_at                   TIMESTAMP
)
PARTITION BY report_date
CLUSTER BY master_product_code, competitor_name, vendor_code, country, city, district_group, district
OPTIONS(description='Eşleşmiş günlük fiyat tablosu (hafif).');


-- =========================
-- 6) PRICE COMPARISONS (UI)
-- =========================
CREATE TABLE IF NOT EXISTS `teknoify_scraping.price_comparisons`
(
  customer_id                   STRING  NOT NULL,
  project_id                    STRING  NOT NULL,
  upload_batch_id               STRING,
  uploaded_at                   TIMESTAMP,

  report_date                   DATE    NOT NULL,

  country                       STRING,
  city                          STRING,
  district_group                STRING,
  district                      STRING,

  master_product_code           STRING,

  -- Our side
  our_vendor_code               STRING,
  store_name                    STRING,
  product_name                  STRING NOT NULL,
  sku                           STRING,
  brand_name                    STRING,
  category_l1                   STRING,
  category_l2                   STRING,
  category_l3                   STRING,
  category_l4                   STRING,
  uom                           STRING,
  unit_count                    FLOAT64,
  package_size                  FLOAT64,
  package_size_uom              STRING,
  our_source_url                STRING,
  our_original_price            NUMERIC,
  our_discount_price            NUMERIC,

  -- Competitor side
  competitor_name               STRING,
  competitor_vendor_code        STRING,
  competitor_store_sku          STRING,
  competitor_store_barcode      STRING,
  competitor_product_name       STRING,
  competitor_source_url         STRING,
  competitor_original_price     NUMERIC,
  competitor_discount_price     NUMERIC,

  campaign_name                 STRING,
  campaign_badge                STRING,
  cart_campaign                 STRING,

  run_id                        STRING,
  scraped_at                    TIMESTAMP,
  ingested_at                   TIMESTAMP,
  match_type                    STRING,
  match_confidence              FLOAT64,
  status                        STRING,
  error_reason                  STRING
)
PARTITION BY report_date
CLUSTER BY customer_id, project_id
OPTIONS(description='Customer/Project bazlı fiyat karşılaştırma tablosu (UI için).');


-- =========================
-- 7) CUSTOMERS / PROJECT ACCESS / UPLOAD LOG
-- =========================
CREATE TABLE IF NOT EXISTS `teknoify_scraping.customers`
(
  customer_id    STRING    NOT NULL,
  company_name   STRING    NOT NULL,
  contact_email  STRING,
  store_label    STRING,
  created_at     TIMESTAMP NOT NULL,
  is_active      BOOL      NOT NULL
);

CREATE TABLE IF NOT EXISTS `teknoify_scraping.project_access`
(
  customer_id    STRING    NOT NULL,
  project_id     STRING    NOT NULL,
  project_type   STRING    NOT NULL,
  project_label  STRING,
  granted_at     TIMESTAMP NOT NULL,
  expires_at     TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `teknoify_scraping.upload_log`
(
  upload_batch_id  STRING    NOT NULL,
  customer_id      STRING    NOT NULL,
  project_id       STRING    NOT NULL,
  source_file_name STRING,
  row_count        INT64,
  report_date_min  DATE,
  report_date_max  DATE,
  status           STRING,
  error_message    STRING,
  created_at       TIMESTAMP NOT NULL,
  rows_inserted    INT64,
  rows_failed      INT64,
  schema_version   STRING
);


-- =========================
-- 8) VIEWS
-- =========================
CREATE OR REPLACE VIEW `teknoify_scraping.vw_latest_comparison` AS
SELECT
  pc.*,
  c.store_label,
  c.company_name
FROM `teknoify_scraping.price_comparisons` pc
LEFT JOIN `teknoify_scraping.customers` c USING (customer_id);

CREATE OR REPLACE VIEW `teknoify_scraping.vw_matched_latest` AS
SELECT * EXCEPT(rn)
FROM (
  SELECT
    mpd.*,
    ROW_NUMBER() OVER (
      PARTITION BY report_date, competitor_name, vendor_code, store_sku, master_product_code, country, city, district_group, district
      ORDER BY ingested_at DESC
    ) AS rn
  FROM `teknoify_scraping.matched_prices_daily` mpd
)
WHERE rn = 1;
