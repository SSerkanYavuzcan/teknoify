/**
 * food/config.js
 * Yiyecek/Restoran scraping projesi ayarları.
 *
 * ─── NASIL KULLANILIR ───────────────────────────────────────────────────────
 * 1. CSV'nizdeki gerçek başlık isimlerini fields{} içine yazın.
 * 2. detailColumns'u ihtiyacınıza göre düzenleyin (az sütun = kısa dizi).
 * 3. brandColors'a rakiplerinizi ekleyin.
 * 4. projectId'yi Firebase'deki entitlement koleksiyonuyla eşleştirin.
 * ────────────────────────────────────────────────────────────────────────────
 */

const PROJECT_CONFIG = {

    // ── KİMLİK ────────────────────────────────────────────────────────────────
    projectId: 'food_scraping',           // Firebase entitlement kontrolü
    pageTitle: 'Yiyecek Fiyat Analizi',   // Sayfa başlığı
    exportFileName: 'teknoify_food_analiz',    // İndirilen dosya adı öneki
    ourStoreLabel: 'Bizim',                  // ⚠️ Müşteri mağaza adını girin

    // ── API ENDPOINT (Cloud Function URL) ───────────────────────────────────────
    apiEndpoint: 'https://europe-west1-teknoify-9449c.cloudfunctions.net/teknoify-api',

    // ── YOL TANIMLARI ─────────────────────────────────────────────────────────
    basePath: '../../',    // dashboard sayfaları (member.html vb.)
    rootPath: '../../../', // kök index.html, pages/login.html

    // ── VERİ ALANLARI (BigQuery — snake_case) ──────────────────────────────────
    // ⚠️  Gerçek BigQuery kolon adlarınızla güncelleyin (eğer farklıysa)
    fields: {
        storeField: 'store_name',
        categoryField: 'category_l2',
        productField: 'product_name',
        skuField: 'sku',
        brandField: 'brand_name',
        dateField: 'report_date',
        ourOrgPrice: 'our_original_price',
        ourDscPrice: 'our_discount_price',
        compStoreName: 'competitor_name',
        compOrgPrice: 'competitor_original_price',
        compDscPrice: 'competitor_discount_price',
    },

    // ── TABLO DETAY KOLONLARI ─────────────────────────────────────────────────
    // Bu projede sadece 3 detay kolonu — quickcommerce'den daha az sütun örneği.
    detailColumns: [
        { key: 'report_date', label: 'Rapor Tarihi' },
        { key: 'category_l2', label: 'Kategori' },
        { key: 'brand_name', label: 'Marka' },
    ],

    // ── RAKİP SIRALAMASI ──────────────────────────────────────────────────────
    competitorSortOrder: [],

    // ── RAKİP RENK HARİTASI ───────────────────────────────────────────────────
    // ⚠️  Rakip isimlerinize göre güncelleyin
    brandColors: {
        // 'yemeksepeti': '#e30613',
        // 'getir':       '#5d3ebc',
    },
    defaultBrandColor: '#f97316',

    // ── KATEGORİ HARİTALAMASI ────────────────────────────────────────────────
    // ⚠️  Kendi kategori yapınıza göre doldurun
    categoryMapping: {
        // "Pizza":   "Fast Food",
        // "Burger":  "Fast Food",
        // "Sushi":   "Asya Mutfağı",
    },
};
