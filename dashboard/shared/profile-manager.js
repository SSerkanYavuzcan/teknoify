
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.init();
    }

    init() {
        this.injectModalHTML();
        this.bindEvents();

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
            }
        });
    }

    injectModalHTML() {
        if (document.getElementById('shared-profile-modal')) return;

        const modalHTML = `
            <div id="shared-profile-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: none; justify-content: center; align-items: center; backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.3s ease;">
                <div style="background: #11131a; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; width: 100%; max-width: 450px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.3s ease;" id="profile-modal-content">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; margin-bottom: 20px;">
                        <h3 style="color: #fff; margin: 0; font-family: 'Inter Tight', sans-serif; font-size: 1.2rem;"><i class="fas fa-user-edit" style="color: #6366f1; margin-right: 8px;"></i> Profili Düzenle</h3>
                        <button id="close-profile-modal" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 1.2rem; transition: color 0.2s;"><i class="fas fa-times"></i></button>
                    </div>

                    <form id="shared-profile-form">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;">Ad Soyad</label>
                            <input type="text" id="prof-fullname" required style="width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; font-family: 'Inter Tight', sans-serif; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                        </div>

                        <div style="margin-bottom: 20px;" id="company-field-wrapper">
                            <label style="display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;">Şirket Adı</label>
                            <input type="text" id="prof-company" style="width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; font-family: 'Inter Tight', sans-serif; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                        </div>

                        <button type="submit" id="btn-save-profile" style="width: 100%; background: #6366f1; color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: 'Inter Tight', sans-serif; transition: background 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;">
                            <span>Değişiklikleri Kaydet</span>
                        </button>
                    </form>

                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Input odaklanma (focus) efektleri
        const inputs = document.querySelectorAll('#shared-profile-form input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => input.style.borderColor = '#6366f1');
            input.addEventListener('blur', () => input.style.borderColor = 'rgba(255,255,255,0.1)');
        });
    }

    bindEvents() {
        // Modalı Kapatma
        const closeBtn = document.getElementById('close-profile-modal');
        const modal = document.getElementById('shared-profile-modal');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        const form = document.getElementById('shared-profile-form');
        form.addEventListener('submit', (e) => this.handleProfileSave(e));
    }

    async openModal() {
        if (!this.currentUser) return;
        
        const modal = document.getElementById('shared-profile-modal');
        const modalContent = document.getElementById('profile-modal-content');
        const btn = document.getElementById('btn-save-profile');
        
        // Verileri Firebase'den çek
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bilgiler Yükleniyor...';
        btn.disabled = true;

        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
            modalContent.style.transform = 'translateY(0)';
        }, 10);

        try {
            const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                const profile = this.userData.profile || {};

                document.getElementById('prof-fullname').value = profile.fullName || "";
                
                const companyWrapper = document.getElementById('company-field-wrapper');
                if (profile.accountType === "kurumsal") {
                    companyWrapper.style.display = 'block';
                    document.getElementById('prof-company').value = profile.companyName || "";
                } else {
                    companyWrapper.style.display = 'none'; // Bireyselse şirket adını gizle
                }
            }
        } catch (error) {
            console.error("Profil bilgileri alınamadı:", error);
            alert("Profil bilgileri yüklenirken bir sorun oluştu.");
        } finally {
            btn.innerHTML = '<span>Değişiklikleri Kaydet</span>';
            btn.disabled = false;
        }
    }

    closeModal() {
        const modal = document.getElementById('shared-profile-modal');
        const modalContent = document.getElementById('profile-modal-content');
        
        modal.style.opacity = '0';
        modalContent.style.transform = 'translateY(20px)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    /**
     * GÜVENLİK KATI: XSS Sanitization (Temizleme) Fonksiyonu
     * Kullanıcının girdiği html/script taglarını zararsız metinlere (entities) çevirir.
     */
    sanitizeInput(str) {
        if (!str) return "";
        const div = document.createElement('div');
        div.textContent = str.trim(); // textContent HTML olarak değil, saf metin olarak yorumlar
        return div.innerHTML;
    }

    async handleProfileSave(e) {
        e.preventDefault();
        
        if (!this.currentUser) return;

        const btn = document.getElementById('btn-save-profile');
        const originalText = btn.innerHTML;

        // 1. Verileri Al ve XSS'e Karşı Temizle!
        const rawFullName = document.getElementById('prof-fullname').value;
        const rawCompany = document.getElementById('prof-company').value;

        const safeFullName = this.sanitizeInput(rawFullName);
        const safeCompany = this.sanitizeInput(rawCompany);

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
        btn.disabled = true;

        try {
            const updatePayload = {
                "profile.fullName": safeFullName
            };

            // Eğer kurumsalsa ve alan açıksa şirketi de güncelle
            if (this.userData && this.userData.profile && this.userData.profile.accountType === "kurumsal") {
                updatePayload["profile.companyName"] = safeCompany;
            }

            // Güvenli Firestore Kurallarımız sadece profile.fullName vb. alanlara izin veriyor.
            // Role veya ProjectAccess göndermediğimiz için kurallardan geçecektir.
            await updateDoc(doc(db, "users", this.currentUser.uid), updatePayload);

            btn.innerHTML = '<i class="fas fa-check"></i> Kaydedildi!';
            btn.style.background = '#10b981';

            // Sayfayı yenilemeye gerek kalmadan UI'ı güncelle
            const nameToDisplay = this.userData.profile.accountType === "kurumsal" && safeCompany !== "" ? safeCompany : safeFullName;
            
            const displayEl = document.getElementById("user-name-display");
            const titleEl = document.getElementById("user-name-title");
            const avatarEl = document.getElementById("user-avatar");
            
            if(displayEl) displayEl.textContent = nameToDisplay;
            if(titleEl) titleEl.textContent = nameToDisplay;
            if(avatarEl) avatarEl.textContent = nameToDisplay.charAt(0).toUpperCase();

            setTimeout(() => {
                this.closeModal();
                btn.innerHTML = originalText;
                btn.style.background = '#6366f1';
                btn.disabled = false;
            }, 1500);

        } catch (error) {
            console.error("Güncelleme Hatası:", error);
            btn.innerHTML = '<i class="fas fa-times"></i> Hata Oluştu';
            btn.style.background = '#ef4444';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '#6366f1';
                btn.disabled = false;
            }, 3000);
        }
    }
}

// Global olarak erişilebilir yap (member.html veya diğer dosyalardan tetiklemek için)
window.SharedProfileManager = new ProfileManager();
