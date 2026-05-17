async function loadDashboardData(sess) {
    try {
        console.log("[member.js] Veri senkronizasyonu başlatıldı:", sess.uid);
        const effectiveUid = sess.userId || sess.uid;

        // HTML üzerindeki elementleri ve kapsayıcıları yakalıyoruz
        const cardFinance = document.getElementById("card-finance");
        const cardHealth = document.getElementById("card-health");
        const cardProductivity = document.getElementById("card-productivity");
        const cardSubscriptions = document.getElementById("card-subscriptions");
        
        // DÜZELTME: Ana ızgara yapısını ve genel içerik alanını yakala
        const personalGrid = document.getElementById("personal-cards-grid");
        const contentScroll = document.querySelector(".content-scroll");

        // 2. Firestore'dan Kullanıcı Dokümanını Oku
        const userSnap = await getDoc(doc(db, "users", effectiveUid));
        
        let hasAnyCard = false; // Kullanıcının herhangi bir kartı var mı kontrolü

        if (userSnap.exists()) {
            const userDoc = userSnap.data();
            const userData = userDoc.data || {};

            // --- FİNANS VERİLERİ VE KART ERİŞİM KONTROLÜ ---
            if (userData.finance) {
                hasAnyCard = true;
                if (cardFinance) cardFinance.style.setProperty('display', 'flex', 'important'); 
                updateUI("portfolio-value", "₺" + (userData.finance.portfolio || "385.240"));
                updateUI("monthly-savings", "₺" + (userData.finance.savings || "12.430"));
            } else {
                if (cardFinance) cardFinance.style.setProperty('display', 'none', 'important'); 
            }

            // --- SAĞLIK VERİLERİ VE KART ERİŞİM KONTROLÜ ---
            if (userData.health) {
                hasAnyCard = true;
                if (cardHealth) cardHealth.style.setProperty('display', 'flex', 'important'); 
                updateUI("user-weight", userData.health.weight || "74.8");
                updateUI("sleep-duration", userData.health.sleep || "7s 24dk");
            } else {
                if (cardHealth) cardHealth.style.setProperty('display', 'none', 'important'); 
            }
            
            // --- VERİMLİLİK KARTI ERİŞİM KONTROLÜ ---
            if (userData.productivity) {
                hasAnyCard = true;
                if (cardProductivity) cardProductivity.style.setProperty('display', 'flex', 'important');
            } else {
                if (cardProductivity) cardProductivity.style.setProperty('display', 'none', 'important'); 
            }

            // --- ABONELİKLER KARTI ERİŞİM KONTROLÜ ---
            if (userData.subscriptions) {
                hasAnyCard = true;
                if (cardSubscriptions) cardSubscriptions.style.setProperty('display', 'flex', 'important');
            } else {
                if (cardSubscriptions) cardSubscriptions.style.setProperty('display', 'none', 'important'); 
            }
            
            // Eğer sidebar.js yüklüyse menüyü tetikle
            if (typeof window.TK_RENDER_SIDEBAR === "function") {
                window.TK_RENDER_SIDEBAR();
            }
        }

        // --- DÜZELTME: DİNAMİK BOŞLUK VE YUKARI KAYDIRMA YAPISI ---
        if (hasAnyCard) {
            // Eğer en az bir kart varsa normal yerleşimi koru
            if (personalGrid) personalGrid.style.setProperty('display', 'grid', 'important');
            if (contentScroll) contentScroll.style.setProperty('padding-top', '120px', 'important');
        } else {
            // Eğer hiçbir kart yoksa, üst boşluğu daralt ve ana kapsayıcıyı tamamen yok et (Yukarı kayar)
            if (personalGrid) personalGrid.style.setProperty('display', 'none', 'important');
            if (contentScroll) contentScroll.style.setProperty('padding-top', '40px', 'important');
        }

    } catch (err) {
        console.error("[member.js] Kritik Hata:", err);
    }
}
