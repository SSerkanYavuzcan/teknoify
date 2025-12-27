document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Daha önce kabul edilmiş mi kontrol et
    if (localStorage.getItem("teknoify_cookie_consent")) {
        return; // Zaten kabul etmiş, hiçbir şey yapma.
    }

    // 2. Link Yolunu Belirle (Ana sayfada mı yoksa alt sayfada mı?)
    // Eğer URL içinde "/pages/" geçiyorsa aynı klasördedir, değilse "pages/" ekle.
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

    // 4. Elementi Sayfaya Ekle
    const bannerDiv = document.createElement("div");
    bannerDiv.className = "cookie-banner"; // CSS'teki class
    bannerDiv.innerHTML = bannerHTML;
    document.body.appendChild(bannerDiv);

    // 5. Animasyonla Göster (Hafif gecikmeli ki dikkat çeksin)
    setTimeout(() => {
        bannerDiv.classList.add("show");
    }, 1000);

    // 6. Buton Olayları
    document.getElementById("btn-cookie-accept").addEventListener("click", function() {
        // Tercihi tarayıcıya kaydet
        localStorage.setItem("teknoify_cookie_consent", "true");
        // Bandı gizle
        bannerDiv.classList.remove("show");
        // DOM'dan sil (Animasyon bitince)
        setTimeout(() => bannerDiv.remove(), 600);
    });

    document.getElementById("btn-cookie-close").addEventListener("click", function() {
        // Sadece kapat, kaydetme (Her girişte tekrar sorar veya oturum bazlı kalır)
        bannerDiv.classList.remove("show");
    });
});

