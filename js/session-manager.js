class SessionManager {
    constructor(options = {}) {
        this.timeoutMinutes = options.timeout || 5;
        this.TIMEOUT_MS = this.timeoutMinutes * 60 * 1000;
        this.STORAGE_KEY = 'teknoify_secure_v2';
        
        this.onSessionExpired = options.onExpired || (() => {});
        this.checkInterval = null;


        this._setupActivityListeners();
        
        if (this.getSession()) {
            this._startWatchdog();
        }
    }


    startSession(userData) {
        const sessionData = {
            user: userData,
            token: this._generateFakeToken(),
            lastActive: Date.now()
        };


        this._saveToStorage(sessionData);
        this._startWatchdog();
    }


    getSession() {
        const encryptedData = localStorage.getItem(this.STORAGE_KEY);
        if (!encryptedData) return null;


        const session = this._decrypt(encryptedData);
        if (!session) return null;


        const now = Date.now();
        
        if (now - session.lastActive > this.TIMEOUT_MS) {
            this.destroySession("timeout"); 
            return null;
        }


        return session.user;
    }


    _startWatchdog() {
        if (this.checkInterval) clearInterval(this.checkInterval);


        this.checkInterval = setInterval(() => {
            const encryptedData = localStorage.getItem(this.STORAGE_KEY);
            if (!encryptedData) {
                this.destroySession("manual");
                return;
            }


            const session = this._decrypt(encryptedData);
            const now = Date.now();
            
            if (now - session.lastActive > this.TIMEOUT_MS) {
                this.destroySession("timeout");
            }
        }, 10000); 
    }


    _setupActivityListeners() {
        const resetTimer = () => this._refreshSession();
        
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('click', resetTimer);
    }


    _refreshSession() {
        const encryptedData = localStorage.getItem(this.STORAGE_KEY);
        if (!encryptedData) return;


        const session = this._decrypt(encryptedData);
        
        if (!session) return;


        session.lastActive = Date.now();
        this._saveToStorage(session);
    }


    destroySession(reason = "manual") {
        localStorage.removeItem(this.STORAGE_KEY);
        if (this.checkInterval) clearInterval(this.checkInterval);
        
        if (reason === "timeout") {
            this.onSessionExpired(); 
        }
    }


    _saveToStorage(data) {
        try {
            const stringData = JSON.stringify(data);
            const obfuscated = btoa(stringData.split('').reverse().join(''));
            localStorage.setItem(this.STORAGE_KEY, obfuscated);
        } catch (e) {
            console.error("Storage Error", e);
        }
    }


    _decrypt(encryptedString) {
        try {
            const decoded = atob(encryptedString).split('').reverse().join('');
            return JSON.parse(decoded);
        } catch (e) {
            return null;
        }
    }


    _generateFakeToken() {
        return Math.random().toString(36).substr(2) + Date.now().toString(36);
    }
}



