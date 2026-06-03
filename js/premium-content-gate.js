(function () {
    const PREMIUM_REDIRECT_KEY = 'tk_post_login_redirect';
    const PREMIUM_ROLES = new Set(['admin', 'premium']);

    function normalizeRoleType(role) {
        if (!role) return null;
        return typeof role === 'object' ? role.type : role;
    }

    async function resolveUserRole(user) {
        if (!user) return { hasAccess: false, reason: 'anonymous' };

        try {
            const tokenResult = await user.getIdTokenResult(true);
            const claims = tokenResult && tokenResult.claims ? tokenResult.claims : {};

            if (claims.admin || claims.premium) {
                return {
                    hasAccess: true,
                    reason: claims.admin ? 'admin' : 'premium'
                };
            }
        } catch (error) {
            console.warn('Premium claim kontrolü tamamlanamadı.', error.message);
        }

        try {
            if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
                return { hasAccess: false, reason: 'role-unavailable' };
            }

            const snap = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!snap.exists) return { hasAccess: false, reason: 'member' };

            const roleType = normalizeRoleType(snap.data().role);
            return {
                hasAccess: PREMIUM_ROLES.has(roleType),
                reason: roleType || 'member'
            };
        } catch (error) {
            console.warn('Premium Firestore rol kontrolü tamamlanamadı.', error.message);
            return { hasAccess: false, reason: 'role-unavailable' };
        }
    }

    async function getCurrentUserAccess(user) {
        return resolveUserRole(user);
    }

    function setPostLoginRedirect() {
        try {
            sessionStorage.setItem(
                PREMIUM_REDIRECT_KEY,
                window.location.pathname + window.location.search + window.location.hash
            );
        } catch (error) {
            console.warn('Premium giriş dönüş adresi saklanamadı.', error.message);
        }
    }

    function updateOverlayCopy(shell, reason) {
        const title = shell.querySelector('[data-premium-lock-title]');
        const description = shell.querySelector('[data-premium-lock-description]');
        const loginAction = shell.querySelector('[data-premium-login-action]');
        const backAction = shell.querySelector('[data-premium-back-action]');

        if (reason === 'member') {
            if (title) title.textContent = 'Abonelik Gerekli';
            if (description) {
                description.textContent =
                    'Bu detaylı analiz alanını görüntülemek için yatırım analizleri aboneliğine ihtiyacınız var.';
            }
            if (loginAction) loginAction.hidden = true;
            if (backAction) backAction.hidden = false;
        } else {
            if (title) title.textContent = 'Premium Perakende Analizi';
            if (description) {
                description.textContent =
                    'Mağaza performansı, şirket karşılaştırmaları ve detaylı finansal veri görünümleri yalnızca giriş yapan premium kullanıcılar tarafından görüntülenebilir.';
            }
            if (loginAction) loginAction.hidden = false;
            if (backAction) backAction.hidden = true;
        }
    }

    function lockPremiumContent(shell, reason) {
        shell.classList.remove('is-unlocked');
        shell.classList.remove('is-auth-checking');
        shell.classList.add('is-locked');
        shell.setAttribute('aria-busy', 'false');
        updateOverlayCopy(shell, reason);
    }

    function unlockPremiumContent(shell) {
        shell.classList.remove('is-locked');
        shell.classList.remove('is-auth-checking');
        shell.classList.add('is-unlocked');
        shell.setAttribute('aria-busy', 'false');
    }

    function openPremiumLogin() {
        setPostLoginRedirect();

        if (window.teknoifyAuthSystem && typeof window.teknoifyAuthSystem.open === 'function') {
            window.teknoifyAuthSystem.open();
            return;
        }

        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            return;
        }

        window.location.href = '../index.html#home';
    }

    function bindPremiumActions(shell) {
        const loginAction = shell.querySelector('[data-premium-login-action]');
        if (loginAction) {
            loginAction.addEventListener('click', openPremiumLogin);
        }
    }

    function initPremiumContentGate() {
        const shell = document.querySelector('[data-premium-content]');
        if (!shell) return;

        bindPremiumActions(shell);
        shell.classList.add('is-auth-checking', 'is-locked');
        shell.setAttribute('aria-busy', 'true');

        if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
            lockPremiumContent(shell, 'anonymous');
            return;
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                lockPremiumContent(shell, 'anonymous');
                return;
            }

            const access = await getCurrentUserAccess(user);
            if (access.hasAccess) {
                unlockPremiumContent(shell);
            } else {
                lockPremiumContent(shell, 'member');
            }
        });
    }

    document.addEventListener('DOMContentLoaded', initPremiumContentGate);
})();
