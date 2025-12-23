/**
 * ================================================================
 * [MODULE] SESSION MANAGER (FIREBASE AUTH GUARD) - UPDATED
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

            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                unsubscribe(); 
               
                if (user) {
                    // --- IMPERSONATE KONTROLÜ ---
                    const impersonatedKey = localStorage.getItem('impersonated_user_key');
                    
                    // Sadece gerçek mailin admin ise taklit moduna izin ver
                    const isAdmin = user.email === 'sserkanyavuzcan99@gmail.com' || user.email.includes('admin');
                    
                    let activeEmail = user.email;
                    let activeUsername = user.email.split('@')[0];
                    let role = isAdmin ? 'admin' : (user.email.includes('premium') ? 'premium' : 'member');
                    let isImpersonating = false;

                    if (impersonatedKey && isAdmin) {
                        console.log("🕵️ Taklit Modu Aktif: " + impersonatedKey + " olarak işlem yapılıyor.");
                        activeEmail = impersonatedKey;
                        activeUsername = impersonatedKey.includes('@') ? impersonatedKey.split('@')[0] : impersonatedKey;
                        isImpersonating = true;
                        // Taklit edilen kişinin rolünü (varsayılan) member olarak döndürür, 
                        // bu sayfa yetkilerini users.json belirler.
                    }

                    console.log("✅ Oturum Onaylandı: " + activeEmail);

                    // Üstte kırmızı taklit barı oluştur (Eğer mod aktifse)
                    if (isImpersonating) {
                        this.showImpersonateBar(activeEmail);
                    }
                   
                    this.updateUserProfile(activeUsername);
                   
                    resolve({
                        username: activeUsername,
                        email: activeEmail,
                        uid: user.uid,
                        role: role,
                        isImpersonated: isImpersonating
                    });
                } else {
                    console.warn("⚠️ Oturum Yok!");
                    reject('No user');
                }
            });
        });
    }

    // Taklit modunda olduğunu hatırlatan üst bar
    showImpersonateBar(targetEmail) {
        if (document.getElementById('impersonate-notice-bar')) return;
        
        const bar = document.createElement('div');
        bar.id = 'impersonate-notice-bar';
        bar.style = `
            background: #ea5455; 
            color: white; 
            text-align: center; 
            padding: 8px; 
            font-size: 13px; 
            font-weight: 600;
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
        `;
        bar.innerHTML = `
            <span><i class="fas fa-user-secret"></i> Şu an <strong>${targetEmail}</strong> hesabını inceliyorsunuz.</span>
            <button onclick="localStorage.removeItem('impersonated_user_key'); location.reload();" 
                    style="background: white; color: #ea5455; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: 700;">
                Gözatmayı Bitir
            </button>
        `;
        document.body.prepend(bar);
        document.body.style.paddingTop = "40px"; // Barın içeriği kapatmaması için
    }

    updateUserProfile(displayName) {
        const nameDisplay = document.getElementById('user-name-display');
        const avatarDisplay = document.getElementById('user-avatar');
       
        if (nameDisplay) nameDisplay.textContent = displayName;
        if (avatarDisplay) avatarDisplay.textContent = displayName.charAt(0).toUpperCase();
    }

    destroySession() {
        if (!this.auth) return;
        localStorage.removeItem('impersonated_user_key'); // Çıkışta temizle
        this.auth.signOut().then(() => {
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error("Çıkış hatası:", error);
        });
    }
}


