
(function() { 
    
    const GA_MEASUREMENT_ID = 'G-1XSJMZ0J2J'; 

    function loadGoogleAnalytics() {
        if (document.getElementById('google-analytics-script')) return;

        console.log("Google Analytics Başlatılıyor: " + GA_MEASUREMENT_ID);

        const script = document.createElement('script');
        script.id = 'google-analytics-script';
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.async = true;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', GA_MEASUREMENT_ID);
    }

    if (localStorage.getItem("teknoify_cookie_consent")) {
        loadGoogleAnalytics(); 
        return; 
    }

    const isPagesDir = window.location.pathname.includes("/pages/");
    const privacyLink = isPagesDir ? "gizlilik.html" : "pages/gizlilik.html";
    const kvkkLink = isPagesDir ? "kvkk.html" : "pages/kvkk.html";

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

    const bannerDiv = document.createElement("div");
    bannerDiv.className = "cookie-banner";
    bannerDiv.innerHTML = bannerHTML;
    document.body.appendChild(bannerDiv);

    setTimeout(() => {
        bannerDiv.classList.add("show");
    }, 1500);

    const acceptBtn = bannerDiv.querySelector("#btn-cookie-accept");
    const closeBtn = bannerDiv.querySelector("#btn-cookie-close");

    if(acceptBtn) {
        acceptBtn.addEventListener("click", function() {
            localStorage.setItem("teknoify_cookie_consent", "true");
            
            loadGoogleAnalytics();

            bannerDiv.classList.remove("show");
            setTimeout(() => bannerDiv.remove(), 600);
        });
    }

    if(closeBtn) {
        closeBtn.addEventListener("click", function() {
            bannerDiv.classList.remove("show");
        });
    }

})();


