class AuthSystem {
    constructor() {
        this.modal = document.getElementById('loginModal');
        this.form = document.getElementById('loginForm');
        this.triggers = document.querySelectorAll('#openLoginBtn, .trigger-login');
        this.bindEvents();
        this.checkCurrentUser();
    }

    bindEvents() {
        this.triggers.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const user = auth ? auth.currentUser : null;
                if (user) {
                    try {
                        // 1. Önce Token (Custom Claims) üzerinden kontrol et (session-manager ile uyumlu)
                        const idTokenResult = await user.getIdTokenResult();
                        let isAdmin = !!idTokenResult.claims.admin;
                        let isPremium = !!idTokenResult.claims.premium;

                        // 2. Token'da yoksa Veritabanına bak (Esnek yapı)
                        if (!isAdmin) {
                            const userDoc = await db.collection('users').doc(user.uid).get();
                            if (userDoc.exists) {
                                const data = userDoc.data();
                                isAdmin = (data.role && data.role.type === 'admin') || data.role === 'admin';
                                isPremium = (data.role && data.role.type === 'premium') || data.role === 'premium';
                            }
                        }

                        if (isAdmin) {
                            window.location.href = '/dashboard/admin.html';
                        } else if (isPremium) {
                            window.location.href = '/dashboard/premium.html';
                        } else {
                            window.location.href = '/dashboard/member.html';
                        }
                    } catch (error) {
                        console.warn("Kullanıcı rolü kontrol edilemedi, standart üyeye yönlendiriliyor.", error.message);
                        window.location.href = '/dashboard/member.html';
                    }
                } else {
                    this.open();
                }
            });
        });

        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
        }
        if (this.form) this.form.addEventListener('submit', (e) => this.handleLogin(e));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const btn = this.form.querySelector('button[type="submit"]');
        const emailInput = document.getElementById('email').value.trim();
        const passInput = document.getElementById('password').value.trim();
        if (!auth || !db) return;
        
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';
        btn.disabled = true;

        auth.signInWithEmailAndPassword(emailInput, passInput)
            .then(async (userCredential) => {
                const user = userCredential.user;
                try {
                    // 1. Önce Token (Custom Claims) üzerinden kontrol et (session-manager ile uyumlu)
                    const idTokenResult = await user.getIdTokenResult();
                    let isAdmin = !!idTokenResult.claims.admin;
                    let isPremium = !!idTokenResult.claims.premium;

                    // 2. Token'da yoksa Veritabanına bak (Esnek yapı)
                    if (!isAdmin) {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            const data = userDoc.data();
                            isAdmin = (data.role && data.role.type === 'admin') || data.role === 'admin';
                            isPremium = (data.role && data.role.type === 'premium') || data.role === 'premium';
                        }
                    }

                    localStorage.setItem('session_start_time', Date.now());
                    
                    btn.innerHTML = '<i class="fas fa-check"></i> Giriş Başarılı';
                    btn.style.backgroundColor = '#10b981';
                    
                    setTimeout(() => {
                        if (isAdmin) {
                            window.location.href = '/dashboard/admin.html';
                        } else if (isPremium) {
                            window.location.href = '/dashboard/premium.html';
                        } else {
                            window.location.href = '/dashboard/member.html';
                        }
                    }, 1000);
                } catch (dbError) {
                    console.warn("--- YETKİ KONTROL UYARISI ---", dbError.message);
                    btn.innerHTML = '<i class="fas fa-check"></i> Giriş Başarılı';
                    btn.style.backgroundColor = '#10b981';
                    setTimeout(() => { window.location.href = '/dashboard/member.html'; }, 1000);
                }
            })
            .catch((error) => {
                console.error("Giriş Hatası:", error);
                let msg = "Giriş başarısız. Bilgilerinizi kontrol edin.";
                if (error.code === 'auth/too-many-requests') msg = "Çok fazla deneme yaptınız.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') msg = "E-posta adresi veya şifre hatalı.";
                if (typeof showToast === "function") showToast("Erişim Reddedildi", msg, "error");
                
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    }

    checkCurrentUser() {
        if (!auth) return;
        auth.onAuthStateChanged((user) => {
            if (user) {
                const loginBtn = document.getElementById('openLoginBtn');
                if (loginBtn) {
                    const displayName = user.displayName || user.email.split('@')[0];
                    loginBtn.innerHTML = '<i class="fas fa-user-circle"></i> ' + displayName;
                    loginBtn.classList.remove('btn-outline');
                    loginBtn.classList.add('btn-secondary');
                }
            }
        });
    }
}
