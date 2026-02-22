/**
 * quickcommerce/config.js
 * Proje-spesifik ayarlar. engine.js & auth.js bu config'i okur.
 *
 * ─── GELECEKTE YENİ PROJE EKLEMEK İÇİN ───
 * Bu dosyayı kopyala, ilgili alanları değiştir.
 * detailColumns dizisini düzenleyerek 16 ↔ 20+ sütun geçişi yapabilirsin.
 * ──────────────────────────────────────────
 */

const PROJECT_CONFIG = {

    // ── KİMLİK ────────────────────────────────────────────────────────────
    projectId: 'web_scraping',        // Firebase entitlement kontrolü
    pageTitle: 'Fiyat Kıyası',         // Sayfa başlığı (<h2>)
    exportFileName: 'teknoify_analiz',     // İndirilen dosya adı öneki
    ourStoreLabel: 'Tazeyo',             // Tabloda “bizim” sütun etiketi (müşteriye özel!)

    // ── API ENDPOINT (Cloud Function URL) ───────────────────────────────────────
    // deploy.sh çalıştırıldıktan sonra gelen URL'yi buraya girin.
    // Örnek: 'https://europe-west1-teknoify-9449c.cloudfunctions.net/teknoify-api'
    apiEndpoint: 'https://europe-west1-teknoify-9449c.cloudfunctions.net/teknoify-api',

    // ── YOL TANIMLARI ─────────────────────────────────────────────────────────
    basePath: '../../',    // member.html, market-analysis.html gibi dashboard içi sayfalar
    rootPath: '../../../', // Kök index.html, pages/login.html vb.

    // ── VERİ ALANLARI (BigQuery kolon adları, snake_case) ───────────────────────
    // Bu alanlar BigQuery'deki price_comparisons tablosunun kolon adlarıyla eşleşmeli.
    fields: {
        storeField: 'store_name',
        categoryField: 'category_l2',           // veya 'category_l1' projeye göre
        productField: 'product_name',
        skuField: 'sku',
        brandField: 'brand_name',
        dateField: 'report_date',           // BigQuery DATE → YYYY-MM-DD string
        ourOrgPrice: 'our_original_price',
        ourDscPrice: 'our_discount_price',
        compStoreName: 'competitor_name',
        compOrgPrice: 'competitor_original_price',
        compDscPrice: 'competitor_discount_price',
    },

    // ── TABLO DETAY KOLONLARI ─────────────────────────────────────────────────────
    // key: BigQuery kolon adı (snake_case), label: tabloda gösterilecek başlık
    detailColumns: [
        { key: 'report_date', label: 'Rapor Tarihi' },
        { key: 'store_name', label: 'Mağaza' },
        { key: 'sku', label: 'SKU' },
        { key: 'brand_name', label: 'Marka' },
        { key: 'category_l2', label: 'Kategori' },
    ],

    // ── RAKİP SIRALAMASI ──────────────────────────────────────────────────────
    // Rakip sütunları bu keyword sıralamasına göre dizilir.
    competitorSortOrder: ['marketten', 'carrefour', 'migros'],

    // ── RAKİP RENK HARİTASI ───────────────────────────────────────────────────
    // key: rakip adında geçmesi gereken alt-dize (lowercase)
    // value: hex renk kodu
    brandColors: {
        migros: '#f5821f',
        carrefour: '#005daa',
        marketten: '#DC6727',
    },
    defaultBrandColor: '#f97316',

    // ── KATEGORİ HARİTALAMASI ────────────────────────────────────────────────
    // Alt kategori adı → Üst kategori adı eşlemesi.
    // engine.js getMainCategory() fonksiyonunda kullanılır.
    categoryMapping: {
        // Meyve & Sebze
        "Taze Meyve": "Meyve & Sebze", "Taze Sebze": "Meyve & Sebze", "Taze Ot & Yeşillik": "Meyve & Sebze", "Patates, Soğan & Sarımsak": "Meyve & Sebze", "Kullanıma Hazır Meyve & Sebze": "Meyve & Sebze",
        // Et & Şarküteri
        "Dana Eti": "Et, Tavuk & Şarküteri", "Kuzu Eti": "Et, Tavuk & Şarküteri", "Tavuk Eti": "Et, Tavuk & Şarküteri", "Kıyma": "Et, Tavuk & Şarküteri", "Pişirilmeye Hazır Etler": "Et, Tavuk & Şarküteri", "Diğer Et Ürünleri": "Et, Tavuk & Şarküteri", "Sucuk & Sosis": "Et, Tavuk & Şarküteri", "Salam & Jambon": "Et, Tavuk & Şarküteri", "Kavurma & Pastırma": "Et, Tavuk & Şarküteri", "Diğer Şarküteri Ürünleri": "Et, Tavuk & Şarküteri", "Sakatat Ürünleri": "Et, Tavuk & Şarküteri",
        // Süt Ürünleri
        "Süt": "Süt & Süt Ürünleri", "Beyaz Peynir": "Süt & Süt Ürünleri", "Kaşar Peyniri": "Süt & Süt Ürünleri", "Diğer Peynirler": "Süt & Süt Ürünleri", "Tereyağı & Margarin": "Süt & Süt Ürünleri", "Yoğurt": "Süt & Süt Ürünleri", "Süt Ürünleri": "Süt & Süt Ürünleri",
        // Kahvaltılık
        "Yumurta": "Kahvaltılık", "Zeytin": "Kahvaltılık", "Bal & Reçel": "Kahvaltılık", "Çikolata & Ezme": "Kahvaltılık", "Tahin & Pekmez": "Kahvaltılık", "Kahvaltılık Gevrek": "Kahvaltılık", "Kahvaltılık Sos": "Kahvaltılık",
        // Temel Gıda
        "Makarna & Mantı": "Temel Gıda", "Pirinç & Bakliyat": "Temel Gıda", "Un & Harçlar": "Temel Gıda", "Tuz & Şeker": "Temel Gıda", "Sıvı Yağ": "Temel Gıda", "Salça & Sos": "Temel Gıda", "Sirke & Salata Sosu": "Temel Gıda", "Baharat & Çeşniler": "Temel Gıda", "Hazır Çorba & Bulyon": "Temel Gıda", "Konserve & Turşu": "Temel Gıda", "Tatlı Malzemeleri": "Temel Gıda", "Aktar Ürünleri": "Temel Gıda",
        // Atıştırmalık
        "Çikolata": "Atıştırmalık", "Kaplamalı & Bar Çikolata": "Atıştırmalık", "Gofret": "Atıştırmalık", "Kek": "Atıştırmalık", "Bisküvi": "Atıştırmalık", "Cips & Patlamış Mısır": "Atıştırmalık", "Kraker & Kurabiye": "Atıştırmalık", "Kuru Yemiş": "Atıştırmalık", "Helva & Krokan": "Atıştırmalık", "Sakız": "Atıştırmalık", "Şekerleme": "Atıştırmalık", "Tatlı": "Atıştırmalık",
        // Su & İçecek
        "Su": "Su & İçecek", "Gazlı İçecek": "Su & İçecek", "Maden Suyu": "Su & İçecek", "Meyve Suyu": "Su & İçecek", "Soğuk Çay & Kahve": "Su & İçecek", "Ayran & Kefir": "Su & İçecek", "Enerji İçeceği": "Su & İçecek", "Hazır & Toz İçecekler": "Su & İçecek", "Diğer İçecekler": "Su & İçecek",
        // Çay & Kahve
        "Siyah Çay": "Çay & Kahve", "Kahve": "Çay & Kahve", "Bitki Çayı": "Çay & Kahve",
        // Fırın
        "Taze Fırın": "Fırından", "Paketli Ekmekler": "Fırından", "Unlu Mamuller": "Fırından", "Tatlı Unlu Mamuller": "Fırından",
        // Dondurma
        "Kutu Dondurma": "Dondurma", "Çubuk Dondurma": "Dondurma", "Çoklu Dondurma": "Dondurma", "Dondurma Bar": "Dondurma", "Külah Dondurma": "Dondurma",
        // Dondurulmuş Gıda
        "Donuk Hamur İşleri": "Dondurulmuş Gıda", "Donuk Et, Tavuk & Balık": "Dondurulmuş Gıda", "Donuk Patates, Meyve & Sebze": "Dondurulmuş Gıda", "Donuk Tatlı & Atıştırmalık": "Dondurulmuş Gıda",
        // Hızlı Yemek
        "Sandviç": "Hızlı Yemek", "Hazır Yemek": "Hızlı Yemek", "Taze Meze": "Hızlı Yemek",
        // Sağlıklı Yaşam
        "Sağlıklı Atıştırmalıklar": "Sağlıklı Yaşam", "Granola & Tahıllı Gevrek": "Sağlıklı Yaşam", "Fit Süt & Süt Ürünleri": "Sağlıklı Yaşam", "Organik": "Sağlıklı Yaşam", "Vegan": "Sağlıklı Yaşam", "Glütensiz": "Sağlıklı Yaşam", "Gıda Takviyeleri & Vitaminler": "Sağlıklı Yaşam",
        // Balık
        "Taze Balık": "Balık & Deniz Ürünleri", "Deniz Ürünleri": "Balık & Deniz Ürünleri",
        // Ev Bakım
        "Çamaşır": "Ev Bakım", "Bulaşık": "Ev Bakım", "Mutfak & Banyo": "Ev Bakım", "Temizlik": "Ev Bakım", "Oda Kokusu": "Ev Bakım", "Böcek İlacı": "Ev Bakım", "Tek Kullanımlık Mutfak Ürünleri": "Ev Bakım", "Buzdolabı & Çöp Poşeti": "Ev Bakım", "Diğer Tek Kullanımlık Ürünler": "Ev Bakım",
        // Kağıt Ürünleri
        "Tuvalet Kağıdı": "Kağıt Ürünleri", "Kağıt Havlu & Peçete": "Kağıt Ürünleri", "Islak Mendil & Havlu": "Kağıt Ürünleri",
        // Kişisel Bakım
        "Şampuan & Saç Kremi": "Kişisel Bakım", "Saç Bakımı": "Kişisel Bakım", "Ağız & Diş Bakımı": "Kişisel Bakım", "Parfüm & Deodorant": "Kişisel Bakım", "Sabun": "Kişisel Bakım", "Duş & Banyo": "Kişisel Bakım", "Hijyenik Ped": "Kişisel Bakım", "Yüz, Cilt & Vücut Bakımı": "Kişisel Bakım", "Tıraş & Epilasyon": "Kişisel Bakım", "Ağda & Tüy Dökücü": "Kişisel Bakım", "Kolonya": "Kişisel Bakım", "Sağlık Ürünleri": "Kişisel Bakım", "Cinsel Sağlık": "Kişisel Bakım", "Bakım & Aksesuar Ürünleri": "Kişisel Bakım",
        // Kozmetik
        "Saç Boyası": "Kozmetik", "Makyaj Malzemeleri": "Kozmetik", "Makyaj Temizleme": "Kozmetik", "Oje & Aseton": "Kozmetik",
        // Bebek
        "Bebek Beslenme": "Bebek", "Bebek Bezi": "Bebek", "Bebek Bakım Ürünleri": "Bebek", "Diğer Bebek Ürünleri": "Bebek",
        // Evcil Hayvan
        "Kedi": "Evcil Hayvan", "Köpek": "Evcil Hayvan", "Pet Aksesuarları & Diğerleri": "Evcil Hayvan",
        // Ev & Yaşam
        "Ev Gereçleri": "Ev & Yaşam", "Sofra & Mutfak": "Ev & Yaşam", "Bahçe": "Ev & Yaşam", "Dergi, Gazete & Kitap": "Ev & Yaşam", "Oyuncak & Kutu Oyunları": "Ev & Yaşam", "Parti Malzemeleri": "Ev & Yaşam", "Kırtasiye Ürünleri": "Ev & Yaşam", "Telefon & Bilgisayar Aksesuarları": "Ev & Yaşam", "Elektrikli Ev Aletleri": "Ev & Yaşam", "Elektrik & Aydınlatma": "Ev & Yaşam", "Pil": "Ev & Yaşam", "Oto Bakım Ürünleri": "Ev & Yaşam",
        // Giyim
        "Giyim & Tekstil": "Giyim & Aksesuar", "Takı & Aksesuar": "Giyim & Aksesuar", "Spor & Outdoor": "Giyim & Aksesuar",
    },
};
