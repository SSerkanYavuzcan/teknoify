// js/cookies.js - Google Analytics (G-1XSJMZ0J2J) Entegreli Versiyon

(function() { 
    
    // --- SENİN GOOGLE ANALYTICS KODUN ---
    const GA_MEASUREMENT_ID = 'G-1XSJMZ0J2J'; 
    // ------------------------------------

    // Google Analytics'i Yükleyen Fonksiyon
    function loadGoogleAnalytics() {
        // Eğer zaten yüklendiyse tekrar yükleme
        if (document.getElementById('google-analytics-script')) return;

        console.log("Google Analytics Başlatılıyor: " + GA_MEASUREMENT_ID);

        // 1. Google Scriptini Dinamik Olarak Ekle
        const script = document.createElement('script');
        script.id = 'google-analytics-script';
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.async = true;
        document.head.appendChild(script);

        // 2. Gtag Yapılandırması (Google'ın verdiği kodun JS hali)
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', GA_MEASUREMENT_ID);
    }

    // 1. Kullanıcı daha önce kabul etmiş mi kontrol et
    if (localStorage.getItem("teknoify_cookie_consent")) {
        loadGoogleAnalytics(); // Evetse, hemen takibe başla!
        return; // Banner'ı gösterme, çık.
    }

    // 2. Link Yolunu Belirle (Ana sayfada mı yoksa alt sayfada mı?)
    const isPagesDir = window.location.pathname.includes("/pages/");
    const privacyLink = isPagesDir ? "gizlilik.html" : "pages/gizlilik.html";
    const kvkkLink = isPagesDir ? "kvkk.html" : "pages/kvkk.html";

    // 3. HTML Yapısını Oluştur
    const bannerHTML = `
        <div class="cookie-content">
            <i class="fas fa-cookie-bite cookie-icon"></i>
            <div class="cookie-text">
                <h4>Çerez Tercihleri</h4>
                <p>
                    Size daha iyi hizmet sunmak, site trafiğini analiz etmek ve kullanıcı deneyimini kişiselleştirmek amacıyla çerezleri (cookies) kullanıyoruz.
                    Detaylı bilgi için <a href="${kvkkLink}">KVKK Aydınlatma Metni</a> ve <a href="${privacyLink}">Gizlilik Politikamızı</a> inceleyebilirsiniz.
                </p>
            </div>
        </div>
        <div class="cookie-actions">
            <button id="btn-cookie-close" class="btn-cookie-close">Kapat</button>
            <button id="btn-cookie-accept" class="btn-cookie-accept">Kabul Et</button>
        </div>
    `;

    // 4. Elementi Oluştur ve Ekle
    const bannerDiv = document.createElement("div");
    bannerDiv.className = "cookie-banner";
    bannerDiv.innerHTML = bannerHTML;
    document.body.appendChild(bannerDiv);

    // 5. Animasyonla Göster
    setTimeout(() => {
        bannerDiv.classList.add("show");
    }, 1500);

    // 6. Buton Olaylarını Tanımla
    const acceptBtn = bannerDiv.querySelector("#btn-cookie-accept");
    const closeBtn = bannerDiv.querySelector("#btn-cookie-close");

    if(acceptBtn) {
        acceptBtn.addEventListener("click", function() {
            // Onay verildi! Tarayıcıya kaydet
            localStorage.setItem("teknoify_cookie_consent", "true");
            
            // ANALYTICS'İ ŞİMDİ BAŞLAT
            loadGoogleAnalytics();

            // Banner'ı kapat
            bannerDiv.classList.remove("show");
            setTimeout(() => bannerDiv.remove(), 600);
        });
    }

    if(closeBtn) {
        closeBtn.addEventListener("click", function() {
            // Sadece kapat, kaydetme (Analytics çalışmaz)
            bannerDiv.classList.remove("show");
        });
    }

})();


