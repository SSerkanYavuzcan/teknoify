/**
 * ================================================================
 * [MODULE] SHARED PROFILE MANAGER
 * Özellikler: XSS Koruması, Fotoğraf Sıkıştırma, Avatar Arka Plan Fix, Toast
 * Yol: dashboard/shared/profile-manager.js
 * ================================================================
 */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.selectedFile = null;
        this.pendingFile = null; // Sıkıştırılmayı bekleyen dosya
        this.onboardingTimer = null;
        this.onboardingModalOpened = false;
        this.onboardingUid = null;
        this.lastAuthUid = null;
        this.lastFocusedElement = null;
        this.isSavingProfile = false;
        this.init();
    }

    init() {
        this.injectModalHTML();
        this.injectToastHTML();
        this.injectCompressionModalHTML();
        this.bindEvents();

        onAuthStateChanged(auth, async (user) => {
            const uidChanged = (user ? user.uid : null) !== this.lastAuthUid;
            this.currentUser = user || null;
            if (uidChanged) {
                this.cancelProfileOnboarding();
                this.onboardingModalOpened = false;
            }
            this.lastAuthUid = user ? user.uid : null;
        });
    }

    /* ---------------------------------------------------------
       1. HTML ENJEKSİYONLARI (Modallar ve Toast)
    --------------------------------------------------------- */
    injectToastHTML() {
        if (document.getElementById('profile-toast')) return;
        const toastHTML = `
            <div id="profile-toast" style="position: fixed; top: 20px; right: -400px; width: 300px; background: #11131a; border-left: 4px solid #10b981; border-radius: 8px; padding: 15px 20px; color: white; z-index: 100000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 15px; transition: right 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); font-family: 'Inter Tight', sans-serif;">
                <i class="fas fa-check-circle" style="color: #10b981; font-size: 24px;"></i>
                <div>
                    <h4 style="margin: 0; font-size: 14px;">Başarılı</h4>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #a1a1aa;">Profiliniz başarıyla güncellendi.</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', toastHTML);
    }

    injectCompressionModalHTML() {
        if (document.getElementById('compression-modal')) return;
        const compHTML = `
            <div id="compression-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 999999; display: none; justify-content: center; align-items: center; backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.3s ease;">
                <div style="background: #11131a; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; width: 100%; max-width: 400px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; transform: translateY(20px); transition: transform 0.3s ease;" id="comp-modal-content">
                    <div style="width: 60px; height: 60px; background: rgba(99, 102, 241, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                        <i class="fas fa-magic" style="color: #6366f1; font-size: 24px;"></i>
                    </div>
                    <h3 style="color: #fff; margin: 0 0 10px 0; font-family: 'Inter Tight', sans-serif; font-size: 1.2rem;">Fotoğraf Boyutu Büyük</h3>
                    <p style="color: #a1a1aa; font-size: 0.9rem; margin: 0 0 25px 0; line-height: 1.5;">Seçtiğiniz dosya 2MB sınırını aşıyor. Yüksek kalitede dönüştürerek yüklememizi ister misiniz?</p>

                    <div style="display: flex; gap: 10px;">
                        <button id="btn-cancel-compress" style="flex: 1; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #e4e4e7; padding: 12px; border-radius: 8px; font-family: 'Inter Tight', sans-serif; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">İptal</button>
                        <button id="btn-compress-image" style="flex: 1; background: #6366f1; border: none; color: #fff; padding: 12px; border-radius: 8px; font-weight: 600; font-family: 'Inter Tight', sans-serif; cursor: pointer; transition: background 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;" onmouseover="this.style.background='#4f46e5'" onmouseout="this.style.background='#6366f1'">
                            <i class="fas fa-sync-alt"></i> Fotoğrafı Dönüştür
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', compHTML);
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

                        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="position: relative; width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: #1e2130; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; flex-shrink: 0;" id="photo-preview-container">
                                <div id="default-avatar-placeholder" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #6366f1; color: white; font-size: 2rem; font-weight: 600;">U</div>
                                <img id="prof-photo-preview" src="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                                    <i class="fas fa-camera" style="color: white; font-size: 1.2rem;"></i>
                                </div>
                            </div>
                            <div style="flex-grow: 1;">
                                <h4 style="margin: 0 0 5px 0; color: #fff; font-size: 1rem; font-family: 'Inter Tight', sans-serif;">Profil Fotoğrafı</h4>
                                <button type="button" id="btn-trigger-upload" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #e4e4e7; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: background 0.2s;"><i class="fas fa-image" style="margin-right: 5px;"></i> Değiştir</button>
                                <input type="file" id="prof-photo-input" accept="image/png, image/jpeg, image/webp" style="display: none;">
                            </div>
                        </div>

                        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <label style="display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;">Ad</label>
                                <input type="text" id="prof-firstname" required style="width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;">Soyisim</label>
                                <input type="text" id="prof-lastname" required style="width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                            </div>
                        </div>

                        <div style="margin-bottom: 25px;" id="company-field-wrapper">
                            <label style="display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;">Şirket Adı</label>
                            <input type="text" id="prof-company" style="width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                        </div>

                        <button type="submit" id="btn-save-profile" style="width: 100%; background: #6366f1; color: #fff; border: none; padding: 14px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;">
                            <span>Değişiklikleri Kaydet</span>
                        </button>
                    </form>

                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const inputs = document.querySelectorAll('#shared-profile-form input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => input.style.borderColor = '#6366f1');
            input.addEventListener('blur', () => input.style.borderColor = 'rgba(255,255,255,0.1)');
        });
    }

    /* ---------------------------------------------------------
       2. FOTOĞRAF DÖNÜŞTÜRME (COMPRESSION) MANTIĞI
    --------------------------------------------------------- */
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');

                    // Fotoğrafı en fazla 1024x1024 boyutuna küçült
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // %85 Kalite ile JPEG'e dönüştür
                    canvas.toBlob((blob) => {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_optimized.jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.85);
                };
                img.onerror = error => reject(error);
            };
        });
    }

    /* ---------------------------------------------------------
       3. OLAY DİNLEYİCİLERİ (EVENTS)
    --------------------------------------------------------- */
    bindEvents() {
        const closeBtn = document.getElementById('close-profile-modal');
        const modal = document.getElementById('shared-profile-modal');

        closeBtn.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        const form = document.getElementById('shared-profile-form');
        form.addEventListener('submit', (e) => this.handleProfileSave(e));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                this.closeModal();
            }
        });

        window.addEventListener('beforeunload', () => this.cancelProfileOnboarding());

        // Sıkıştırma Modalı Butonları
        const compModal = document.getElementById('compression-modal');
        const compModalContent = document.getElementById('comp-modal-content');
        const btnCancelComp = document.getElementById('btn-cancel-compress');
        const btnRunComp = document.getElementById('btn-compress-image');
        const fileInput = document.getElementById('prof-photo-input');

        btnCancelComp.addEventListener('click', () => {
            compModal.style.opacity = '0';
            compModalContent.style.transform = 'translateY(20px)';
            setTimeout(() => compModal.style.display = 'none', 300);
            this.pendingFile = null;
            fileInput.value = "";
        });

        btnRunComp.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!this.pendingFile) return;

            const origText = btnRunComp.innerHTML;
            btnRunComp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşleniyor...';
            btnRunComp.disabled = true;

            try {
                // Fotoğrafı dönüştür
                this.selectedFile = await this.compressImage(this.pendingFile);

                // Önizlemeye bas
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgPreview = document.getElementById('prof-photo-preview');
                    const placeholder = document.getElementById('default-avatar-placeholder');
                    imgPreview.src = event.target.result;
                    imgPreview.style.display = 'block';
                    placeholder.style.display = 'none';
                };
                reader.readAsDataURL(this.selectedFile);

                // Modalı kapat
                compModal.style.opacity = '0';
                compModalContent.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    compModal.style.display = 'none';
                    btnRunComp.innerHTML = origText;
                    btnRunComp.disabled = false;
                }, 300);

            } catch (error) {
                console.error("Dönüştürme hatası:", error);
                btnRunComp.innerHTML = '<i class="fas fa-times"></i> Hata';
                setTimeout(() => { btnRunComp.innerHTML = origText; btnRunComp.disabled = false; }, 2000);
            }
        });

        document.getElementById('btn-trigger-upload').addEventListener('click', () => fileInput.click());
        document.getElementById('photo-preview-container').addEventListener('click', () => fileInput.click());

        // Fotoğraf Seçimi ve 2MB Kontrolü
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 2MB (2 * 1024 * 1024) Sınırı
                if (file.size > 2097152) {
                    this.pendingFile = file;
                    compModal.style.display = 'flex';
                    setTimeout(() => {
                        compModal.style.opacity = '1';
                        compModalContent.style.transform = 'translateY(0)';
                    }, 10);
                    return; // Pop-up onayı bekle
                }

                // Sınırın altındaysa normal devam
                this.selectedFile = file;
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

    /* ---------------------------------------------------------
       4. ANA İŞLEMLER (Açma, Kapama, Kaydetme)
    --------------------------------------------------------- */
    showSuccessToast() {
        const toast = document.getElementById('profile-toast');
        toast.style.right = '20px';
        setTimeout(() => { toast.style.right = '-400px'; }, 4000);
    }

    scheduleProfileOnboarding(user) {
        if (!user || this.onboardingModalOpened) return;
        this.cancelProfileOnboarding();
        this.onboardingUid = user.uid;
        this.onboardingTimer = window.setTimeout(() => {
            this.onboardingTimer = null;
            if (this.onboardingModalOpened || !this.currentUser || this.currentUser.uid !== user.uid) return;

            const modal = document.getElementById('shared-profile-modal');
            if (modal && modal.style.display === 'flex') return;

            this.openModal({ onboarding: true, user, profile: null });
        }, 1500);
    }

    cancelProfileOnboarding() {
        if (this.onboardingTimer) {
            window.clearTimeout(this.onboardingTimer);
            this.onboardingTimer = null;
        }
        this.onboardingUid = null;
    }

    getAuthDisplayNameParts(user) {
        const displayName = (user && user.displayName ? user.displayName : '').trim();
        const parts = displayName.split(/\s+/).filter(Boolean);
        return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || ''
        };
    }

    focusFirstIncompleteField() {
        const fields = [
            document.getElementById('prof-firstname'),
            document.getElementById('prof-lastname'),
            document.getElementById('prof-company')
        ].filter(field => field && field.offsetParent !== null && !field.disabled && !field.value.trim());

        const target = fields[0] || document.getElementById('prof-firstname');
        if (target) target.focus();
    }

    async openModal(options = {}) {
        const requestedUser = options.user || this.currentUser;
        if (!requestedUser) return;

        if (options.onboarding && this.onboardingModalOpened) return;
        if (!options.onboarding) {
            this.onboardingModalOpened = true;
            this.cancelProfileOnboarding();
        }

        this.currentUser = requestedUser;
        this.lastFocusedElement = document.activeElement;

        const modal = document.getElementById('shared-profile-modal');
        const modalContent = document.getElementById('profile-modal-content');
        if (modal.style.display === 'flex') return;

        this.selectedFile = null;
        this.pendingFile = null;
        if (options.onboarding) this.onboardingModalOpened = true;

        const fileInput = document.getElementById('prof-photo-input');
        if (fileInput) fileInput.value = "";

        const btn = document.getElementById('btn-save-profile');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bilgiler Yükleniyor...';
        btn.disabled = true;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => { modal.style.opacity = '1'; modalContent.style.transform = 'translateY(0)'; }, 10);

        try {
            let profile = options.profile || null;
            let userData = null;

            if (Object.prototype.hasOwnProperty.call(options, 'profile')) {
                userData = profile ? { profile } : { profile: {} };
            } else {
                const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));
                if (userDoc.exists()) {
                    const rootData = userDoc.data() || {};
                    userData = rootData.data || rootData || {};
                    profile = userData.profile || {};
                } else {
                    userData = { profile: {} };
                    profile = {};
                }
            }

            this.userData = userData;
            const fullName = profile.fullName || "";
            const nameParts = fullName.trim().split(" ").filter(Boolean);
            const authNameParts = this.getAuthDisplayNameParts(this.currentUser);

            document.getElementById('prof-firstname').value = nameParts[0] || authNameParts.firstName || "";
            document.getElementById('prof-lastname').value = nameParts.slice(1).join(" ") || authNameParts.lastName || "";

            const imgPreview = document.getElementById('prof-photo-preview');
            const placeholder = document.getElementById('default-avatar-placeholder');
            const authPhotoURL = this.currentUser.photoURL || "";
            const photoURL = profile.photoURL || authPhotoURL;

            if (photoURL) {
                imgPreview.src = photoURL;
                imgPreview.style.display = 'block';
                placeholder.style.display = 'none';
            } else {
                imgPreview.style.display = 'none';
                placeholder.style.display = 'flex';
                placeholder.textContent = (nameParts[0] || authNameParts.firstName || "U").charAt(0).toUpperCase();
            }

            const companyWrapper = document.getElementById('company-field-wrapper');
            if (profile.accountType === "kurumsal") {
                companyWrapper.style.display = 'block';
                document.getElementById('prof-company').value = profile.companyName || "";
            } else {
                companyWrapper.style.display = 'none';
                document.getElementById('prof-company').value = "";
            }
        } catch (error) {
            console.error("Profil bilgileri alınamadı:", error);
        } finally {
            btn.innerHTML = '<span>Değişiklikleri Kaydet</span>';
            btn.disabled = false;
            setTimeout(() => this.focusFirstIncompleteField(), 50);
        }
    }

    closeModal() {
        const modal = document.getElementById('shared-profile-modal');
        const modalContent = document.getElementById('profile-modal-content');
        modal.style.opacity = '0';
        modalContent.style.transform = 'translateY(20px)';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
                this.lastFocusedElement.focus();
            }
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
        if (!this.currentUser || this.isSavingProfile) return;

        const btn = document.getElementById('btn-save-profile');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşleniyor...';
        btn.disabled = true;
        this.isSavingProfile = true;

        try {
            const rawFirst = document.getElementById('prof-firstname').value.trim();
            const rawLast = document.getElementById('prof-lastname').value.trim();
            const cleanFirst = rawFirst.replace(/\s+/g, ' ');
            const cleanLast = rawLast.replace(/\s+/g, ' ');
            const mergedFullName = `${cleanFirst} ${cleanLast}`;

            const safeFullName = this.sanitizeInput(mergedFullName);
            const safeCompany = this.sanitizeInput(document.getElementById('prof-company').value);

            const updatePayload = { profile: { fullName: safeFullName } };

            if (this.userData && this.userData.profile && this.userData.profile.accountType === "kurumsal") {
                updatePayload.profile.companyName = safeCompany;
            }

            // FOTOĞRAF YÜKLEME (FIREBASE STORAGE)
            if (this.selectedFile) {
                const storageRef = ref(storage, `users/${this.currentUser.uid}/profile_photo.jpg`);
                await uploadBytes(storageRef, this.selectedFile);
                const downloadURL = await getDownloadURL(storageRef);
                updatePayload.profile.photoURL = downloadURL;
            }

            // Firestore güncellemesi (ilk profil oluşturma ve mevcut profil güncelleme)
            await setDoc(doc(db, "users", this.currentUser.uid), updatePayload, { merge: true });

            this.showSuccessToast();
            this.cancelProfileOnboarding();

            // Ekrandaki UI güncellemeleri
            const finalName = safeFullName;
            const displayEl = document.getElementById("user-name-display");
            const titleEl = document.getElementById("user-name-title");
            const avatarEl = document.getElementById("user-avatar");

            if(displayEl) displayEl.textContent = finalName;
            if(titleEl) titleEl.textContent = finalName;

            if(avatarEl) {
                const currentPhotoURL = updatePayload.profile.photoURL || (this.userData.profile && this.userData.profile.photoURL);
                if (currentPhotoURL) {
                    avatarEl.innerHTML = `<img src="${currentPhotoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    // ARKA PLAN DÜZELTMESİ: Fotoğraf yüklendiğinde mor rengi kaldırıyoruz.
                    avatarEl.style.background = 'transparent';
                } else {
                    avatarEl.innerHTML = cleanFirst.charAt(0).toUpperCase();
                    // ARKA PLAN DÜZELTMESİ: Fotoğraf yoksa mor rengi geri getiriyoruz.
                    avatarEl.style.background = '#6366f1';
                }
            }

            setTimeout(() => {
                this.closeModal();
                btn.innerHTML = originalText;
                btn.disabled = false;
                this.isSavingProfile = false;
                window.dispatchEvent(new CustomEvent('shared-profile-updated', { detail: { uid: this.currentUser.uid } }));
            }, 1000);

        } catch (error) {
            console.error("Güncelleme Hatası:", error);
            btn.innerHTML = '<i class="fas fa-times"></i> Hata Oluştu';
            btn.style.background = '#ef4444';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '#6366f1';
                btn.disabled = false;
                this.isSavingProfile = false;
            }, 3000);
        }
    }
}

window.SharedProfileManager = new ProfileManager();
