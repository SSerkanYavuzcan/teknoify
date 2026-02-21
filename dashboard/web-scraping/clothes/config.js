/**
 * clothes/config.js
 * Giyim scraping projesi ayarları.
 *
 * ─── NASIL KULLANILIR ───────────────────────────────────────────────────────
 * 1. CSV'nizdeki gerçek başlık isimlerini fields{} içine yazın.
 * 2. detailColumns'u ihtiyacınıza göre düzenleyin.
 * 3. brandColors'a rakiplerinizi ekleyin.
 * 4. projectId'yi Firebase'deki entitlement koleksiyonuyla eşleştirin.
 * ────────────────────────────────────────────────────────────────────────────
 */

const PROJECT_CONFIG = {

    // ── KİMLİK ────────────────────────────────────────────────────────────
    projectId: 'clothes_scraping',        // Firebase entitlement kontrolü
    pageTitle: 'Giyim Fiyat Analizi',     // Sayfa başlığı
    exportFileName: 'teknoify_clothes_analiz', // İndirilen dosya adı öneki
    ourStoreLabel: 'Bizim',                  // ⚠️ Müşteri mağaza adını girin

    // ── API ENDPOINT (Cloud Function URL) ───────────────────────────────────────
    apiEndpoint: 'https://REGION-PROJECT_ID.cloudfunctions.net/teknoify-api',

    // ── YOL TANIMLARI ─────────────────────────────────────────────────────────
    basePath: '../../',
    rootPath: '../../../',

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
    // Giyim projesi için 4 detay kolonu örneği (beden, renk gibi eklenebilir)
    detailColumns: [
        { key: 'report_date', label: 'Rapor Tarihi' },
        { key: 'store_name', label: 'Mağaza' },
        { key: 'category_l2', label: 'Kategori' },
        { key: 'brand_name', label: 'Marka' },
        // { key: 'size',     label: 'Beden'        }, // ← giyime özel ekstra kolon örneği
        // { key: 'color',    label: 'Renk'         },
    ],

    // ── RAKİP SIRALAMASI ──────────────────────────────────────────────────────
    competitorSortOrder: [],

    // ── RAKİP RENK HARİTASI ───────────────────────────────────────────────────
    // ⚠️  Rakip isimlerinize göre güncelleyin
    brandColors: {
        // 'zara':  '#000000',
        // 'hm':    '#e50010',
        // 'lcw':   '#e4002b',
    },
    defaultBrandColor: '#7367f0',

    // ── KATEGORİ HARİTALAMASI ────────────────────────────────────────────────
    // ⚠️  Kendi kategori yapınıza göre doldurun
    categoryMapping: {
        // "Elbise":  "Kadın Giyim",
        // "Bluz":    "Kadın Giyim",
        // "Pantolon": "Erkek Giyim",
    },
};
