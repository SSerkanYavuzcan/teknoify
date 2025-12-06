/**
 * ================================================================
 * [MODULE] SESSION MANAGER (REDIS SIMULATION)
 * Güvenli, şifreli ve zaman ayarlı oturum yönetimi.
 * ================================================================
 */

class SessionManager {
    constructor() {
        // AYAR: Oturum kaç dakika sürecek? (5 Dakika = 300.000 ms)
        this.TIMEOUT_MS = 5 * 60 * 1000; 
        this.STORAGE_KEY = 'teknoify_secure_session';
    }

    /**
     * [CORE] Oturumu Başlat (Login anında çağrılır)
     * @param {Object} userData - Kullanıcı verileri (rol, isim vb.)
     */
    startSession(userData) {
        const sessionData = {
            user: userData,
            createdAt: Date.now(),    // İlk giriş saati
            lastActive: Date.now()    // Son işlem saati
        };

        this._saveToStorage(sessionData);
        console.log("🔒 Güvenli Oturum Başlatıldı (TTL: 5dk)");
    }

    /**
     * [CORE] Oturumu Kontrol Et (Her sayfa açılışında çağrılır)
     * @returns {Object|null} - Geçerliyse kullanıcı verisi, değilse null
     */
    validateSession() {
        const encryptedData = localStorage.getItem(this.STORAGE_KEY);
        if (!encryptedData) return null; // Hiç veri yok

        const session = this._decrypt(encryptedData);
        if (!session) return null; // Veri bozuk

        const now = Date.now();
        const diff = now - session.lastActive;

        // 1. KURAL: 5 Dakika geçti mi?
        if (diff > this.TIMEOUT_MS) {
            console.warn("⚠️ Oturum zaman aşımına uğradı. (Browser kapalıydı)");
            this.destroySession(); // Veriyi sil
            return null; // Oturumu geçersiz say
        }

        // 2. KURAL: Süre dolmadıysa süreyi uzat (Refresh)
        session.lastActive = now;
        this._saveToStorage(session); // Yeni saati kaydet
        
        return session.user; // Kullanıcıyı içeri al
    }

    /**
     * [ACTION] Çıkış Yap
     */
    destroySession() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log("🔓 Oturum Sonlandırıldı.");
    }

    /**
     * [INTERNAL] Veriyi Şifreleyip Kaydet (Mock Encryption)
     * Gerçek projede crypto-js kullanılır. Burada Base64 ile simüle ediyoruz.
     */
    _saveToStorage(data) {
        try {
            const jsonString = JSON.stringify(data);
            // Basit bir şifreleme (Base64) - Gözle okumayı engeller
            const encrypted = btoa(unescape(encodeURIComponent(jsonString)));
            localStorage.setItem(this.STORAGE_KEY, encrypted);
        } catch (e) {
            console.error("Session Save Error:", e);
        }
    }

    /**
     * [INTERNAL] Veriyi Çöz (Decryption)
     */
    _decrypt(encryptedString) {
        try {
            const jsonString = decodeURIComponent(escape(atob(encryptedString)));
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Session Tampered!", e);
            return null;
        }
    }
}

