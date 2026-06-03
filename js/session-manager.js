
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
                        const now = Date.now();
                        let sessionStartTime = localStorage.getItem('session_start_time');

                        if (!sessionStartTime) {
                            sessionStartTime = now;
                            localStorage.setItem('session_start_time', sessionStartTime);
                        }

                        const elapsedTime = now - parseInt(sessionStartTime, 10);
                        const maxSessionDuration = 3 * 60 * 60 * 1000; // 3 Saat

                        if (elapsedTime > maxSessionDuration) {
                            console.warn("⏳ Oturum süresi doldu (3 saati geçti). Otomatik çıkış yapılıyor...");
                            this.destroySession(); 
                            reject('Session Expired');
                            return;
                        }

                        const idTokenResult = await user.getIdTokenResult();
                        
                        const isAdmin = !!idTokenResult.claims.admin;
                                                
                        const impersonatedKey = localStorage.getItem('impersonated_user_key');
                        
                        let activeEmail = user.email;
                        let isImpersonating = false;

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

    startSessionTimer() {
        localStorage.setItem('session_start_time', Date.now());
    }

    showImpersonateBar(targetEmail) {
        if (document.getElementById('impersonate-notice-bar')) return;
        
        const bar = document.createElement('div');
        bar.id = 'impersonate-notice-bar';
        
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

        const infoSpan = document.createElement('span');
        infoSpan.textContent = `🕵️ Şu an `;
        const strongEmail = document.createElement('strong');
        strongEmail.textContent = targetEmail; 
        infoSpan.appendChild(strongEmail);
        infoSpan.appendChild(document.createTextNode(' kullanıcısının panelindesiniz.'));

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
        
        if (nameDisplay) nameDisplay.textContent = displayName;
        if (avatarDisplay) avatarDisplay.textContent = displayName.charAt(0).toUpperCase();
    }

    destroySession() {
        if (!this.auth) return;
        
        localStorage.removeItem('session_start_time');
        localStorage.removeItem('impersonated_user_key');
        localStorage.removeItem('impersonated_user_id');

        this.auth.signOut().then(() => {
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
