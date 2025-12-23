/**
 * ================================================================
 * [MODULE] SESSION MANAGER (FIREBASE AUTH GUARD)
 * Panel sayfalarının güvenliğini sağlar. Kullanıcı her sayfa
 * yenilediğinde Firebase'e sorar: "Bu kişi hala geçerli mi?"
 * ================================================================
 */

// Firebase Config (Tekrar tanımlıyoruz, çünkü bu dosya bazen tek başına çalışabilir)
// Eğer script.js'den önce yüklenirse hata vermemesi için.
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
        // Firebase Auth servisine eriş
        this.auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
    }

    /**
     * [CORE] Oturumu Doğrula (Promise Döndürür)
     * Panel sayfalarında (member.html, analysis.html vb.) sayfa yüklenince çağrılır.
     * Oturum varsa kullanıcı verisini döner (then), yoksa reddeder (catch).
     */
    validateSession() {
        return new Promise((resolve, reject) => {
            if (!this.auth) {
                console.error("Firebase Auth yüklenemedi!");
                reject("Auth Error");
                return;
            }

            // Firebase'in oturum durumunu dinle (listener)
            // Bu asenkron bir işlemdir, cevap gelene kadar bekleriz.
            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                unsubscribe(); // Dinlemeyi bırak (tek seferlik kontrol yeterli)
                
                if (user) {
                    console.log("✅ Güvenli Oturum Onaylandı: " + user.email);
                    
                    // Kullanıcı bilgilerini (isim, avatar) UI'da güncelle
                    this.updateUserProfile(user);
                    
                    // Şimdilik 'role' bilgisini basitçe email'e göre veya localStorage'dan alıyoruz.
                    // Gerçek projede: Firestore'dan kullanıcının rolünü (claims) çekmek gerekir.
                    // Geçici Çözüm: E-posta "admin" içeriyorsa admin say.
                    let role = 'member';
                    if (user.email.includes('admin')) role = 'admin';
                    if (user.email.includes('premium')) role = 'premium';

                    resolve({
                        username: user.email.split('@')[0],
                        email: user.email,
                        uid: user.uid,
                        role: role 
                    });
                } else {
                    console.warn("⚠️ Oturum Yok veya Süresi Dolmuş! Yönlendiriliyor...");
                    reject('No user'); // Catch bloğuna düşer, sayfa Login'e yönlenir
                }
            });
        });
    }

    /**
     * [UI] Header'daki Kullanıcı Bilgisini Güncelle
     */
    updateUserProfile(user) {
        const nameDisplay = document.getElementById('user-name-display');
        const avatarDisplay = document.getElementById('user-avatar');
        
        // E-postanın '@' işaretinden önceki kısmını isim olarak al
        // Örn: serkan.yavuzcan@gmail.com -> serkan.yavuzcan
        const displayName = user.displayName || user.email.split('@')[0];
        
        if (nameDisplay) {
            nameDisplay.textContent = displayName;
            // Mobilde uzun isimleri kısaltmak isterseniz CSS ile text-overflow kullanın
        }
        
        if (avatarDisplay) {
            // İsmin baş harfini al
            const letter = displayName.charAt(0).toUpperCase();
            avatarDisplay.textContent = letter;
        }
    }

    /**
     * [ACTION] Çıkış Yap
     */
    destroySession() {
        if (!this.auth) return;
        
        this.auth.signOut().then(() => {
            console.log("🔓 Başarıyla Çıkış Yapıldı.");
            // Çıkış yapınca ana sayfaya gönder
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error("Çıkış hatası:", error);
            alert("Çıkış yapılırken bir hata oluştu.");
        });
    }
}


