window.TEKNOIFY_DEMOS = [
    {
        id: 'retail-price-compare',
        title: 'Web Scraping Fiyat Karşılaştırma',
        category: 'Web Scraping',
        icon: 'fa-spider',
        level: 'Başlangıç',
        time: '2 dk',
        status: 'Free Demo',
        description:
            'Perakende sektöründe ortak ürünleri listeleyen şirketlerin fiyatlarını karşılaştıran örnek veri setini inceleyebilirsiniz.',
        outputType: 'retailComparisonTable',
        primaryMetric: '5 ürün',
        sampleOutput: {
            columns: [
                'Ürün Barkodu',
                'Ürün Adı',
                'CarrefourSA Fiyatı',
                'Migros Fiyatı',
                'Ürün Kategorisi'
            ],
            rows: [
                {
                    barcode: '8690637715001',
                    name: 'Coca-Cola 1 L',
                    carrefourPrice: '₺39,90',
                    migrosPrice: '₺41,50',
                    category: 'İçecek'
                },
                {
                    barcode: '8690504010123',
                    name: 'Pınar Süt 1 L',
                    carrefourPrice: '₺34,95',
                    migrosPrice: '₺35,90',
                    category: 'Süt & Kahvaltılık'
                },
                {
                    barcode: '8693029600015',
                    name: 'Banvit Piliç Bonfile 1 kg',
                    carrefourPrice: '₺219,90',
                    migrosPrice: '₺224,90',
                    category: 'Et & Tavuk'
                },
                {
                    barcode: '8690572740130',
                    name: 'Torku Toz Şeker 1 kg',
                    carrefourPrice: '₺42,50',
                    migrosPrice: '₺43,75',
                    category: 'Temel Gıda'
                },
                {
                    barcode: '8697406770017',
                    name: 'Eti Burçak 131 g',
                    carrefourPrice: '₺19,90',
                    migrosPrice: '₺21,25',
                    category: 'Atıştırmalık'
                }
            ]
        }
    }
];
