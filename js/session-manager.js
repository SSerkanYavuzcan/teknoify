/**
 * ================================================================
 * [MODULE] SESSION MANAGER (FIREBASE AUTH GUARD) - ULTIMATE SECURE VERSION
 * ================================================================
 */

const firebaseConfigSession = {
    apiKey: "AIzaSyC1Id7kdU23_A7fEO1eDna0HKprvIM30E8",
    authDomain: "teknoify-9449c.firebaseapp.com",
    projectId: "teknoify-9449c",
    storageBucket: "teknoify-9449c.firebasestorage.app",
    messagingSenderId: "704314596026",
    appId: "1:704314596026:web:f63fff04c00b7a698ac083",
    measurementId: "G-1DZKJE7BXE"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfigSession);
}

class SessionManager {
    constructor() {
        this.auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
    }

    validateSession() {
        return new Promise((resolve, reject) => {
            if (!this.auth) {
                console.error("Firebase Auth yüklenemedi!");
                reject("Auth Error");
                return;
            }

            const unsubscribe = this.auth.onAuthStateChanged(async (user) => {
                unsubscribe(); 
                
                if (user) {
                    try {
                        // GÜVENLİK GÜNCELLEMESİ 5: 3 Saatlik Oturum Kontrolü (10.800.000 ms)
                        const now = Date.now();
                        let sessionStartTime = localStorage.getItem('session_start_time');

                        if (!sessionStartTime) {
                            // Eğer zaman damgası yoksa (yeni giriş yapıldıysa), şu anı kaydet
                            sessionStartTime = now;
                            localStorage.setItem('session_start_time', sessionStartTime);
                        }

                        const elapsedTime = now - parseInt(sessionStartTime, 10);
                        const maxSessionDuration = 3 * 60 * 60 * 1000; // 3 Saat

                        if (elapsedTime > maxSessionDuration) {
                            console.warn("⏳ Oturum süresi doldu (3 saati geçti). Otomatik çıkış yapılıyor...");
                            this.destroySession(); // Çıkış yap ve storage'ları temizle
                            reject('Session Expired');
                            return;
                        }

                        // GÜVENLİK GÜNCELLEMESİ 1: Sadece Custom Claims'e güveniyoruz.
                        const idTokenResult = await user.getIdTokenResult();
                        
                        // Tek gerçek yetki kaynağı:
                        const isAdmin = !!idTokenResult.claims.admin;
                        
                        // GÜVENLİK GÜNCELLEMESİ 2: Hardcoded e-posta kontrolü tamamen kaldırıldı.
                        
                        const impersonatedKey = localStorage.getItem('impersonated_user_key');
                        
                        let activeEmail = user.email;
                        let isImpersonating = false;

                        // GÜVENLİK GÜNCELLEMESİ 3: Taklit modu SADECE gerçek Admin Claims varsa çalışır.
                        if (isAdmin && impersonatedKey) {
                            console.log("🕵️ Admin Gözetim Modu Aktif");
                            activeEmail = impersonatedKey;
                            isImpersonating = true;
                            this.showImpersonateBar(activeEmail);
                        }

                        const displayName = activeEmail ? activeEmail.split('@')[0] : "User";
                        this.updateUserProfile(displayName);
                        
                        resolve({
                            username: displayName,
                            email: activeEmail,
                            uid: user.uid,
                            role: isAdmin ? 'admin' : 'member',
                            isImpersonated: isImpersonating,
                            actualUser: user 
                        });
                    } catch (error) {
                        console.error("Token doğrulanırken hata oluştu:", error);
                        reject(error);
                    }
                } else {
                    console.warn("⚠️ Oturum Yok!");
                    reject('No user');
                }
            });
        });
    }

    /**
     * Oturumu manuel başlatırken çağrılabilir (Örn: script.js içindeki signIn metodunda)
     * Kullanıcı şifresini yazıp girdiği an süreyi milisaniyesi milisaniyesine sıfırlamak için eklendi.
     */
    startSessionTimer() {
        localStorage.setItem('session_start_time', Date.now());
    }

    /**
     * GÜVENLİK GÜNCELLEMESİ 4: DOM-XSS Koruması
     * innerHTML tamamen kaldırıldı. textContent ve createElement kullanılıyor.
     */
    showImpersonateBar(targetEmail) {
        if (document.getElementById('impersonate-notice-bar')) return;
        
        const bar = document.createElement('div');
        bar.id = 'impersonate-notice-bar';
        
        // Stil atamaları
        Object.assign(bar.style, {
            background: "#ea5455",
            color: "white",
            textAlign: "center",
            padding: "10px",
            fontSize: "13px",
            fontWeight: "700",
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            zIndex: "10000",
            boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
            fontFamily: "'Inter Tight', sans-serif"
        });

        // Metin kısmı (Güvenli textContent)
        const infoSpan = document.createElement('span');
        infoSpan.textContent = `🕵️ Şu an `;
        const strongEmail = document.createElement('strong');
        strongEmail.textContent = targetEmail; // XSS engelleme noktası
        infoSpan.appendChild(strongEmail);
        infoSpan.appendChild(document.createTextNode(' kullanıcısının panelindesiniz.'));

        // Geri dönüş butonu
        const backBtn = document.createElement('button');
        backBtn.textContent = 'Admin Paneline Dön';
        Object.assign(backBtn.style, {
            background: "white",
            color: "#ea5455",
            border: "none",
            padding: "5px 15px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "800",
            transition: "0.3s"
        });

        backBtn.onclick = () => {
            localStorage.removeItem('impersonated_user_key');
            localStorage.removeItem('impersonated_user_id');
            window.location.href = '/dashboard/admin.html';
        };

        bar.appendChild(infoSpan);
        bar.appendChild(backBtn);
        
        document.body.prepend(bar);
        document.body.style.paddingTop = "45px"; 
    }

    updateUserProfile(displayName) {
        const nameDisplay = document.getElementById('user-name-display');
        const avatarDisplay = document.getElementById('user-avatar');
        
        // textContent kullanımı XSS'i engeller
        if (nameDisplay) nameDisplay.textContent = displayName;
        if (avatarDisplay) avatarDisplay.textContent = displayName.charAt(0).toUpperCase();
    }

    destroySession() {
        if (!this.auth) return;
        
        // Çıkış yapıldığında oturum süresi damgasını ve taklit verilerini temizle
        localStorage.removeItem('session_start_time');
        localStorage.removeItem('impersonated_user_key');
        localStorage.removeItem('impersonated_user_id');

        this.auth.signOut().then(() => {
            // Sitenizde ayrı bir login sayfası olmadığı için ana sayfaya yönlendiriyoruz
            window.location.href = '/'; 
        }).catch((error) => {
            console.error("Çıkış hatası:", error);
            window.location.href = '/';
        });
    }
}

if (typeof window !== 'undefined') {
    window.SessionManager = SessionManager;
}
