/**
 * ================================================================
 * [MODULE] SHARED PROFILE MANAGER (XSS PROTECTED & AVATAR UPLOAD)
 * Yol: dashboard/shared/profile-manager.js
 * ================================================================
 */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
// NOT: Firebase Storage kütüphanesi eklenecek

const auth = getAuth();
const db = getFirestore();

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.selectedFile = null; // Seçilen fotoğraf dosyasını tutmak için
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
                <div style="background: #11131a; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; width: 100%; max-width: 480px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.3s ease;" id="profile-modal-content">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; margin-bottom: 25px;">
                        <h3 style="color: #fff; margin: 0; font-family: 'Inter Tight', sans-serif; font-size: 1.2rem;"><i class="fas fa-user-edit" style="color: #6366f1; margin-right: 8px;"></i> Profili Düzenle</h3>
                        <button id="close-profile-modal" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 1.2rem; transition: color 0.2s;"><i class="fas fa-times"></i></button>
                    </div>

                    <form id="shared-profile-form">
                        
                        <!-- FOTOĞRAF DÜZENLEME ALANI -->
                        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="position: relative; width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: #1e2130; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; flex-shrink: 0;" id="photo-preview-container">
                                <!-- Varsayılan İkon veya Fotoğraf Gelecek -->
                                <div id="default-avatar-placeholder" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #6366f1; color: white; font-size: 2rem; font-weight: 600;">U</div>
                                <img id="prof-photo-preview" src="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                                
                                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                                    <i class="fas fa-camera" style="color: white; font-size: 1.2rem;"></i>
                                </div>
                            </div>
                            <div style="flex-grow: 1;">
                                <h4 style="margin: 0 0 5px 0; color: #fff; font-size: 1rem; font-family: 'Inter Tight', sans-serif;">Profil Fotoğrafı</h4>
                                <p style="margin: 0 0 10px 0; color: #71717a; font-size: 0.8rem;">PNG, JPG (Max 2MB)</p>
                                <button type="button" id="btn-trigger-upload" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #e4e4e7; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: background 0.2s;"><i class="fas fa-image" style="margin-right: 5px;"></i> Fotoğraf Seç</button>
                                <input type="file" id="prof-photo-input" accept="image/png, image/jpeg, image/webp" style="display: none;">
                            </div>
                        </div>

                        <!-- AD VE SOYAD ALANI (YAN YANA) -->
                        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <label style="display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;">Ad</label>
                                <input type="text" id="prof-firstname" required placeholder="Örn: Serkan" style="width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; font-family: 'Inter Tight', sans-serif; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;">Soyisim</label>
                                <input type="text" id="prof-lastname" required placeholder="Örn: Yavuzcan" style="width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; font-family: 'Inter Tight', sans-serif; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                            </div>
                        </div>

                        <!-- ŞİRKET ADI ALANI -->
                        <div style="margin-bottom: 25px;" id="company-field-wrapper">
                            <label style="display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;">Şirket Adı</label>
                            <input type="text" id="prof-company" style="width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; font-family: 'Inter Tight', sans-serif; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                        </div>

                        <button type="submit" id="btn-save-profile" style="width: 100%; background: #6366f1; color: #fff; border: none; padding: 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: 'Inter Tight', sans-serif; transition: background 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;">
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
        const closeBtn = document.getElementById('close-profile-modal');
        const modal = document.getElementById('shared-profile-modal');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        const form = document.getElementById('shared-profile-form');
        form.addEventListener('submit', (e) => this.handleProfileSave(e));

        // Fotoğraf Yükleme Tetikleyicileri ve Önizleme
        const fileInput = document.getElementById('prof-photo-input');
        
        document.getElementById('btn-trigger-upload').addEventListener('click', () => fileInput.click());
        document.getElementById('photo-preview-container').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Basit bir boyut kontrolü (Örn: 2MB limit)
                if (file.size > 2 * 1024 * 1024) {
                    alert("Seçtiğiniz fotoğraf çok büyük. Lütfen 2MB'den küçük bir dosya seçin.");
                    fileInput.value = "";
                    return;
                }

                this.selectedFile = file; // Yükleme işlemi için dosyayı hafızaya al
                
                // Seçilen fotoğrafı önizleme olarak göster
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgPreview = document.getElementById('prof-photo-preview');
                    const placeholder = document.getElementById('default-avatar-placeholder');
                    
                    imgPreview.src = event.target.result;
                    imgPreview.style.display = 'block';
                    placeholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async openModal() {
        if (!this.currentUser) return;
        
        const modal = document.getElementById('shared-profile-modal');
        const modalContent = document.getElementById('profile-modal-content');
        const btn = document.getElementById('btn-save-profile');
        
        // Modal açıldığında dosya seçimini sıfırla
        this.selectedFile = null;
        document.getElementById('prof-photo-input').value = "";

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

                // --- İSİM AYIRMA MANTIĞI ---
                const fullName = profile.fullName || "";
                const nameParts = fullName.trim().split(" ");
                
                let firstName = "";
                let lastName = "";

                if (nameParts.length > 1) {
                    lastName = nameParts.pop(); // Son kelimeyi soyad yap
                    firstName = nameParts.join(" "); // Geri kalanları ad yap
                } else {
                    firstName = fullName; // Sadece tek kelime girildiyse
                }

                document.getElementById('prof-firstname').value = firstName;
                document.getElementById('prof-lastname').value = lastName;
                
                // Fotoğrafı Yükle
                const imgPreview = document.getElementById('prof-photo-preview');
                const placeholder = document.getElementById('default-avatar-placeholder');
                
                if (profile.photoURL && profile.photoURL.trim() !== "") {
                    imgPreview.src = profile.photoURL;
                    imgPreview.style.display = 'block';
                    placeholder.style.display = 'none';
                } else {
                    imgPreview.style.display = 'none';
                    placeholder.style.display = 'flex';
                    placeholder.textContent = firstName.charAt(0).toUpperCase() || 'U';
                }

                // Şirket Alanı Kontrolü
                const companyWrapper = document.getElementById('company-field-wrapper');
                if (profile.accountType === "kurumsal") {
                    companyWrapper.style.display = 'block';
                    document.getElementById('prof-company').value = profile.companyName || "";
                } else {
                    companyWrapper.style.display = 'none'; 
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

    sanitizeInput(str) {
        if (!str) return "";
        const div = document.createElement('div');
        div.textContent = str.trim(); 
        return div.innerHTML;
    }

    async handleProfileSave(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const btn = document.getElementById('btn-save-profile');
        const originalText = btn.innerHTML;

        // --- AD VE SOYAD BİRLEŞTİRME MANTIĞI ---
        const rawFirst = document.getElementById('prof-firstname').value.trim();
        const rawLast = document.getElementById('prof-lastname').value.trim();
        
        // Fazla boşlukları temizle (Örn: "Serkan   Ali" -> "Serkan Ali")
        const cleanFirst = rawFirst.replace(/\s+/g, ' ');
        const cleanLast = rawLast.replace(/\s+/g, ' ');

        const mergedFullName = `${cleanFirst} ${cleanLast}`;
        const rawCompany = document.getElementById('prof-company').value;

        // XSS Taraması
        const safeFullName = this.sanitizeInput(mergedFullName);
        const safeCompany = this.sanitizeInput(rawCompany);

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
        btn.disabled = true;

        try {
            const updatePayload = {
                "profile.fullName": safeFullName
            };

            // Şirket ismi varsa ekle
            if (this.userData && this.userData.profile && this.userData.profile.accountType === "kurumsal") {
                updatePayload["profile.companyName"] = safeCompany;
            }

            // *** DİKKAT: FOTOĞRAF YÜKLEME ALANI ***
            if (this.selectedFile) {
                console.log("Fotoğraf Firebase Storage'a yüklenmeli, ancak Storage bağlantısı henüz yapılmadı.");
                // Burada Firebase Storage'a yükleme işlemi olacak
                // ve updatePayload["profile.photoURL"] = yüklenen_url; şeklinde eklenecek.
            }

            await updateDoc(doc(db, "users", this.currentUser.uid), updatePayload);

            btn.innerHTML = '<i class="fas fa-check"></i> Kaydedildi!';
            btn.style.background = '#10b981';

            // Ekrandaki UI güncellemeleri
            const nameToDisplay = this.userData.profile.accountType === "kurumsal" && safeCompany !== "" ? safeCompany : safeFullName;
            
            const displayEl = document.getElementById("user-name-display");
            const titleEl = document.getElementById("user-name-title");
            const avatarEl = document.getElementById("user-avatar");
            
            if(displayEl) displayEl.textContent = nameToDisplay;
            if(titleEl) titleEl.textContent = nameToDisplay;
            if(avatarEl && !this.selectedFile && (!this.userData.profile.photoURL)) {
                avatarEl.textContent = cleanFirst.charAt(0).toUpperCase();
            }

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

window.SharedProfileManager = new ProfileManager();
