/**
 * ================================================================
 * [MODULE] SESSION MANAGER (FIREBASE AUTH GUARD) - FINAL VERSION
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

// Eğer Firebase başlatılmamışsa başlat
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfigSession);
}

class SessionManager {
    constructor() {
        this.auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
    }

    /**
     * Oturumu doğrular ve impersonate durumunu kontrol eder.
     */
    validateSession() {
        return new Promise((resolve, reject) => {
            if (!this.auth) {
                console.error("Firebase Auth yüklenemedi!");
                reject("Auth Error");
                return;
            }

            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                unsubscribe(); 
               
                if (user) {
                    // 1. Admin yetkisi kontrolü (Sadece bu mail impersonate yapabilir)
                    const isAdmin = user.email === 'sserkanyavuzcan99@gmail.com';
                    
                    // 2. LocalStorage'da taklit kaydı var mı?
                    const impersonatedKey = localStorage.getItem('impersonated_user_key');
                    
                    let activeEmail = user.email;
                    let isImpersonating = false;

                    // 3. Eğer kişi adminse ve taklit modunu açtıysa kimliği maskele
                    if (isAdmin && impersonatedKey) {
                        console.log("🕵️ Admin Gözetim Modu: " + impersonatedKey);
                        activeEmail = impersonatedKey;
                        isImpersonating = true;
                        this.showImpersonateBar(activeEmail);
                    }

                    // 4. UI Bilgilerini Güncelle (Sağ üst isim/avatar)
                    const displayName = activeEmail.split('@')[0];
                    this.updateUserProfile(displayName);
                   
                    // 5. Sayfaya kullanıcı objesini döndür
                    resolve({
                        username: displayName,
                        email: activeEmail,
                        uid: user.uid,
                        role: isAdmin ? 'admin' : 'member',
                        isImpersonated: isImpersonating
                    });
                } else {
                    console.warn("⚠️ Oturum Yok! Login sayfasına yönlendiriliyor...");
                    reject('No user');
                }
            });
        });
    }

    /**
     * Admin için sayfanın en üstünde kırmızı bilgilendirme barı gösterir.
     */
    showImpersonateBar(targetEmail) {
        if (document.getElementById('impersonate-notice-bar')) return;
        
        const bar = document.createElement('div');
        bar.id = 'impersonate-notice-bar';
        bar.style = `
            background: #ea5455; 
            color: white; 
            text-align: center; 
            padding: 10px; 
            font-size: 13px; 
            font-weight: 700;
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            font-family: 'Inter Tight', sans-serif;
        `;
        bar.innerHTML = `
            <span><i class="fas fa-user-secret"></i> Şu an <strong>${targetEmail}</strong> kullanıcısının panelindesiniz.</span>
            <button onclick="localStorage.removeItem('impersonated_user_key'); window.location.href='admin.html';" 
                    style="background: white; color: #ea5455; border: none; padding: 5px 15px; border-radius: 6px; cursor: pointer; font-weight: 800; transition: 0.3s;">
                Admin Paneline Dön
            </button>
        `;
        document.body.prepend(bar);
        document.body.style.paddingTop = "45px"; // Sayfa içeriği barın altında kalmasın
    }

    /**
     * Sayfadaki profil bilgilerini (Header) günceller.
     */
    updateUserProfile(displayName) {
        const nameDisplay = document.getElementById('user-name-display');
        const avatarDisplay = document.getElementById('user-avatar');
       
        if (nameDisplay) {
            nameDisplay.textContent = displayName;
        }
       
        if (avatarDisplay) {
            avatarDisplay.textContent = displayName.charAt(0).toUpperCase();
        }
    }

    /**
     * Güvenli çıkış yapar ve tüm taklit verilerini temizler.
     */
    destroySession() {
        if (!this.auth) return;
        
        // Çıkış yaparken taklit modunu mutlaka kapat
        localStorage.removeItem('impersonated_user_key');

        this.auth.signOut().then(() => {
            console.log("🔓 Oturum kapatıldı.");
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error("Çıkış hatası:", error);
            window.location.href = '../index.html';
        });
    }
}

if (typeof window !== 'undefined') {
    window.SessionManager = SessionManager;
}

