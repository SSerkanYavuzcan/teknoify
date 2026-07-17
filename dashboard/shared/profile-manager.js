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
import { PHONE_COUNTRIES } from "./phone-countries.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();
const DEFAULT_PHONE_COUNTRY = "TR";

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
        this.uploadedPhotoURLForRetry = '';
        this.profileFormDirty = false;
        this.currentStep = 1;
        this.allowedSectorValues = new Set([
            'retail_ecommerce',
            'finance_banking',
            'technology_software',
            'logistics_transport',
            'manufacturing',
            'healthcare',
            'education',
            'food_fmcg',
            'professional_services',
            'other'
        ]);
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
        const fieldStyle = "width: 100%; background: #05080a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 8px; box-sizing: border-box; outline: none; transition: border-color 0.2s;";
        const labelStyle = "display: block; color: #a1a1aa; font-size: 0.85rem; margin-bottom: 6px; font-family: 'Inter Tight', sans-serif;";
        const modalHTML = `
            <style>
                .phone-field-combined { display: flex; width: 100%; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: #05080a; transition: border-color 0.2s, box-shadow 0.2s; }
                .phone-field-combined:focus-within { border-color: #6366f1; box-shadow: 0 0 0 1px rgba(99,102,241,0.2); }
                .phone-field-combined.phone-field-invalid { border-color: #ef4444; box-shadow: 0 0 0 1px rgba(239,68,68,0.18); }
                .phone-field-combined select, .phone-field-combined input { background: transparent !important; border: 0 !important; color: #fff; outline: none; box-sizing: border-box; }
                .phone-field-combined select { width: 175px; flex: 0 0 175px; border-right: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px 0 0 8px; padding: 12px 10px; }
                .phone-field-combined input { flex: 1; min-width: 0; border-radius: 0 8px 8px 0; padding: 12px 15px; }
                .phone-field-combined select option { background: #11131a; color: #fff; }
                @media (max-width: 520px) {
                    #profile-modal-content { width: calc(100% - 24px) !important; padding: 22px !important; }
                    .profile-field-grid { grid-template-columns: 1fr !important; }
                    .profile-step-actions { flex-direction: column !important; }
                    .profile-step-actions button { width: 100% !important; }
                }
                @media (max-width: 420px) {
                    .phone-field-combined { flex-direction: column; }
                    .phone-field-combined select { width: 100%; flex-basis: auto; border-right: 0 !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px 8px 0 0; }
                    .phone-field-combined input { width: 100%; border-radius: 0 0 8px 8px; }
                }
            </style>
            <div id="shared-profile-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: none; justify-content: center; align-items: center; backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.3s ease; padding: 16px; box-sizing: border-box;">
                <div style="background: #11131a; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; width: 100%; max-width: 560px; max-height: calc(100vh - 32px); overflow-y: auto; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.3s ease; box-sizing: border-box;" id="profile-modal-content" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">

                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; margin-bottom: 16px;">
                        <h3 id="profile-modal-title" style="color: #fff; margin: 0; font-family: 'Inter Tight', sans-serif; font-size: 1.2rem;"><i class="fas fa-user-edit" style="color: #6366f1; margin-right: 8px;"></i> Profili Düzenle</h3>
                        <button type="button" id="close-profile-modal" aria-label="Profili kapat" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 1.2rem; transition: color 0.2s;"><i class="fas fa-times"></i></button>
                    </div>

                    <div id="profile-step-progress" aria-label="Profil adımları" style="display: flex; align-items: center; gap: 10px; margin-bottom: 22px; color: #71717a; font-family: 'Inter Tight', sans-serif; font-size: 0.85rem;">
                        <span id="profile-progress-step-1" aria-current="step" style="display: inline-flex; align-items: center; gap: 6px; color: #6366f1; font-weight: 700;"><span style="display:inline-flex; width:22px; height:22px; border-radius:50%; background:rgba(99,102,241,0.16); align-items:center; justify-content:center;">1</span> Kişisel Bilgiler</span>
                        <span aria-hidden="true">→</span>
                        <span id="profile-progress-step-2" style="display: inline-flex; align-items: center; gap: 6px; color: #71717a; font-weight: 600;"><span style="display:inline-flex; width:22px; height:22px; border-radius:50%; background:rgba(255,255,255,0.05); align-items:center; justify-content:center;">2</span> Şirket ve İhtiyaçlar</span>
                    </div>

                    <form id="shared-profile-form" novalidate>
                        <section id="profile-step-1" aria-labelledby="profile-step-1-title">
                            <h4 id="profile-step-1-title" style="color:#fff; font-family:'Inter Tight', sans-serif; margin:0 0 14px; font-size:1rem;">Kişisel Bilgiler</h4>
                            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="position: relative; width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: #1e2130; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; flex-shrink: 0;" id="photo-preview-container">
                                    <div id="default-avatar-placeholder" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #6366f1; color: white; font-size: 2rem; font-weight: 600;">U</div>
                                    <img id="prof-photo-preview" src="" alt="Profil fotoğrafı önizlemesi" style="width: 100%; height: 100%; object-fit: cover; display: none;">
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
                            <div class="profile-field-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; margin-bottom: 15px;">
                                <div><label for="prof-firstname" style="${labelStyle}">Ad</label><input type="text" id="prof-firstname" autocomplete="given-name" maxlength="60" required style="${fieldStyle}"></div>
                                <div><label for="prof-lastname" style="${labelStyle}">Soyisim</label><input type="text" id="prof-lastname" autocomplete="family-name" maxlength="80" required style="${fieldStyle}"></div>
                                <div><label for="prof-phone-national" style="${labelStyle}">Telefon</label><div id="prof-phone-group" class="phone-field-combined"><select id="prof-phone-country" aria-label="Ülke telefon kodu" autocomplete="tel-country-code"></select><input type="tel" id="prof-phone-national" autocomplete="tel-national" inputmode="numeric" maxlength="28" aria-describedby="prof-phone-error" placeholder="5XX XXX XX XX"></div><p id="prof-phone-error" role="alert" aria-live="polite" style="display:none; color:#ef4444; font-size:0.8rem; margin:6px 0 0; font-family:'Inter Tight', sans-serif;"></p></div>
                                <div><label for="prof-position" style="${labelStyle}">Pozisyon / Ünvan</label><input type="text" id="prof-position" autocomplete="organization-title" maxlength="100" placeholder="Örn. Operasyon Müdürü" style="${fieldStyle}"></div>
                            </div>
                            <div class="profile-step-actions" style="display:flex; justify-content:flex-end; margin-top:25px;"><button type="button" id="btn-profile-next" style="background: #6366f1; color: #fff; border: none; padding: 14px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Devam Et</button></div>
                        </section>

                        <section id="profile-step-2" aria-labelledby="profile-step-2-title" aria-hidden="true" hidden>
                            <h4 id="profile-step-2-title" style="color:#fff; font-family:'Inter Tight', sans-serif; margin:0 0 14px; font-size:1rem;">Şirket ve İhtiyaçlar</h4>
                            <div style="display:grid; gap:15px; margin-bottom:8px;">
                                <div id="company-field-wrapper"><label for="prof-company" style="${labelStyle}">Şirket Adı</label><input type="text" id="prof-company" autocomplete="organization" maxlength="140" style="${fieldStyle}"></div>
                                <div><label for="prof-company-website" style="${labelStyle}">Şirket Web Sitesi</label><input type="text" id="prof-company-website" autocomplete="url" inputmode="url" maxlength="250" placeholder="https://sirketiniz.com" aria-describedby="prof-company-website-error" style="${fieldStyle}"><p id="prof-company-website-error" role="alert" style="display:none; color:#f87171; font-size:0.8rem; margin:6px 0 0; font-family:'Inter Tight', sans-serif;"></p></div>
                                <div><label for="prof-sector" style="${labelStyle}">Sektör</label><select id="prof-sector" style="${fieldStyle}"><option value="" disabled selected>Sektör seçin</option><option value="retail_ecommerce">Perakende ve E-ticaret</option><option value="finance_banking">Finans ve Bankacılık</option><option value="technology_software">Teknoloji ve Yazılım</option><option value="logistics_transport">Lojistik ve Taşımacılık</option><option value="manufacturing">Üretim</option><option value="healthcare">Sağlık</option><option value="education">Eğitim</option><option value="food_fmcg">Gıda ve Hızlı Tüketim</option><option value="professional_services">Profesyonel Hizmetler</option><option value="other">Diğer</option></select></div>
                            </div>
                            <div class="profile-step-actions" style="display:flex; gap:12px; justify-content:space-between; margin-top:25px;"><button type="button" id="btn-profile-back" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #e4e4e7; padding: 14px 18px; border-radius: 8px; font-weight: 600; cursor: pointer;">Geri</button><button type="submit" id="btn-save-profile" style="background: #6366f1; color: #fff; border: none; padding: 14px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;"><span>Değişiklikleri Kaydet</span></button></div>
                        </section>
                    </form>

                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        this.populatePhoneCountries();
        const fields = document.querySelectorAll('#shared-profile-form input, #shared-profile-form select');
        fields.forEach(input => {
            if (!input.closest('.phone-field-combined')) {
                input.addEventListener('focus', () => input.style.borderColor = '#6366f1');
                input.addEventListener('blur', () => input.style.borderColor = 'rgba(255,255,255,0.1)');
            }
            input.addEventListener('input', () => { this.profileFormDirty = true; });
            input.addEventListener('change', () => { this.profileFormDirty = true; });
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

        document.getElementById('btn-profile-next').addEventListener('click', () => this.goToStep2());
        document.getElementById('btn-profile-back').addEventListener('click', () => this.showProfileStep(1));
        form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.currentStep === 1) {
                e.preventDefault();
                this.goToStep2();
            }
        });
        document.getElementById('prof-phone-national').addEventListener('input', () => this.formatPhoneInput());
        document.getElementById('prof-phone-national').addEventListener('paste', () => window.setTimeout(() => this.formatPhoneInput(), 0));
        document.getElementById('prof-phone-country').addEventListener('change', () => {
            this.updatePhonePlaceholder();
            this.formatPhoneInput();
        });

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

    populatePhoneCountries() {
        const countrySelect = document.getElementById('prof-phone-country');
        if (!countrySelect || countrySelect.options.length) return;
        countrySelect.innerHTML = PHONE_COUNTRIES.map(country =>
            `<option value="${country.iso2}">${country.flag} ${country.name} (${country.dialCode})</option>`
        ).join('');
        countrySelect.value = DEFAULT_PHONE_COUNTRY;
    }

    getPhoneCountry(iso2) {
        return PHONE_COUNTRIES.find(country => country.iso2 === iso2) || PHONE_COUNTRIES[0];
    }

    findCountryByDialCode(value) {
        const normalized = (value || '').replace(/[^\d+]/g, '');
        if (!normalized.startsWith('+')) return null;
        return [...PHONE_COUNTRIES]
            .sort((a, b) => b.dialCode.length - a.dialCode.length)
            .find(country => normalized.startsWith(country.dialCode)) || null;
    }

    getPhoneDigits(value) {
        return (value || '').replace(/\D/g, '');
    }

    stripDialCode(value, country) {
        const compact = (value || '').replace(/[^\d+]/g, '');
        if (compact.startsWith(country.dialCode)) {
            return compact.slice(country.dialCode.length).replace(/\D/g, '');
        }
        return this.getPhoneDigits(value);
    }

    formatTurkishNational(value) {
        let digits = this.getPhoneDigits(value);
        if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
        if (digits.length > 10 && digits.startsWith('90')) digits = digits.slice(2);
        const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean);
        return groups.join(' ');
    }

    setPhoneError(message = '') {
        const group = document.getElementById('prof-phone-group');
        const input = document.getElementById('prof-phone-national');
        const error = document.getElementById('prof-phone-error');
        const invalid = Boolean(message);
        if (group) group.classList.toggle('phone-field-invalid', invalid);
        if (input) {
            if (invalid) input.setAttribute('aria-invalid', 'true');
            else input.removeAttribute('aria-invalid');
        }
        if (error) {
            error.textContent = message;
            error.style.display = invalid ? 'block' : 'none';
        }
    }

    updatePhonePlaceholder() {
        const country = this.getPhoneCountry(document.getElementById('prof-phone-country')?.value);
        const input = document.getElementById('prof-phone-national');
        if (!input) return;
        input.placeholder = country.iso2 === 'TR' ? '5XX XXX XX XX' : 'Telefon numarası';
    }

    validatePhone({ showError = false } = {}) {
        const country = this.getPhoneCountry(document.getElementById('prof-phone-country')?.value);
        const inputValue = document.getElementById('prof-phone-national')?.value || '';
        const hasPlus = inputValue.trim().startsWith('+');
        let nationalDigits = hasPlus ? this.stripDialCode(inputValue, this.findCountryByDialCode(inputValue) || country) : this.getPhoneDigits(inputValue);
        if (!nationalDigits) {
            this.setPhoneError('');
            return { valid: true, normalized: '', countryIso2: country.iso2 };
        }

        if (country.iso2 === 'TR') {
            if (nationalDigits.length === 12 && nationalDigits.startsWith('90')) nationalDigits = nationalDigits.slice(2);
            if (nationalDigits.length === 11 && nationalDigits.startsWith('0')) nationalDigits = nationalDigits.slice(1);
            if (nationalDigits.length !== 10) {
                if (showError) this.setPhoneError('Türkiye telefon numarası 10 haneli olmalıdır.');
                return { valid: false };
            }
            if (!nationalDigits.startsWith('5')) {
                if (showError) this.setPhoneError('Cep telefonu numarası 5 ile başlamalıdır.');
                return { valid: false };
            }
            this.setPhoneError('');
            return { valid: true, normalized: `+90${nationalDigits}`, countryIso2: 'TR' };
        }

        const dialDigits = country.dialCode.replace(/\D/g, '');
        if (/[^0-9\s()+-]/.test(inputValue)) {
            if (showError) this.setPhoneError('Geçerli bir telefon numarası girin.');
            return { valid: false };
        }
        const totalDigits = `${dialDigits}${nationalDigits}`;
        if (totalDigits.length > 15) {
            if (showError) this.setPhoneError('Telefon numarası en fazla 15 haneli olabilir.');
            return { valid: false };
        }
        if (totalDigits.length < 8) {
            if (showError) this.setPhoneError('Geçerli bir telefon numarası girin.');
            return { valid: false };
        }
        this.setPhoneError('');
        return { valid: true, normalized: `+${totalDigits}`, countryIso2: country.iso2 };
    }

    formatPhoneInput() {
        const input = document.getElementById('prof-phone-national');
        const countrySelect = document.getElementById('prof-phone-country');
        if (!input || !countrySelect) return;
        const pastedCountry = input.value.trim().startsWith('+') ? this.findCountryByDialCode(input.value) : null;
        if (pastedCountry) countrySelect.value = pastedCountry.iso2;
        const country = this.getPhoneCountry(countrySelect.value);
        const nationalDigits = input.value.trim().startsWith('+') ? this.stripDialCode(input.value, country) : input.value;
        input.value = country.iso2 === 'TR' ? this.formatTurkishNational(nationalDigits) : this.getPhoneDigits(nationalDigits);
        this.updatePhonePlaceholder();
        this.validatePhone({ showError: Boolean(document.getElementById('prof-phone-error')?.textContent) });
    }

    loadPhoneValue(profile = {}) {
        const countrySelect = document.getElementById('prof-phone-country');
        const input = document.getElementById('prof-phone-national');
        if (!countrySelect || !input) return;
        const storedPhone = profile.phone || '';
        let country = profile.phoneCountry ? this.getPhoneCountry(profile.phoneCountry) : null;
        if (!country && storedPhone.startsWith('+')) country = this.findCountryByDialCode(storedPhone);
        if (!country && /^0?5\d{9}$/.test(this.getPhoneDigits(storedPhone))) country = this.getPhoneCountry('TR');
        country = country || this.getPhoneCountry(DEFAULT_PHONE_COUNTRY);
        countrySelect.value = country.iso2;
        const national = storedPhone.startsWith('+') ? this.stripDialCode(storedPhone, country) : this.getPhoneDigits(storedPhone);
        input.value = country.iso2 === 'TR' ? this.formatTurkishNational(national) : national;
        this.updatePhonePlaceholder();
        this.setPhoneError('');
    }


    showProfileStep(step) {
        this.currentStep = step;
        const step1 = document.getElementById('profile-step-1');
        const step2 = document.getElementById('profile-step-2');
        const progress1 = document.getElementById('profile-progress-step-1');
        const progress2 = document.getElementById('profile-progress-step-2');
        const activeColor = '#6366f1';
        const inactiveColor = '#71717a';

        step1.hidden = step !== 1;
        step2.hidden = step !== 2;
        step1.setAttribute('aria-hidden', step === 1 ? 'false' : 'true');
        step2.setAttribute('aria-hidden', step === 2 ? 'false' : 'true');
        progress1.style.color = step === 1 ? activeColor : inactiveColor;
        progress2.style.color = step === 2 ? activeColor : inactiveColor;
        progress1.toggleAttribute('aria-current', step === 1);
        progress2.toggleAttribute('aria-current', step === 2);

        window.setTimeout(() => {
            const target = step === 1 ? document.getElementById('prof-firstname') : document.getElementById('prof-company');
            if (target) target.focus();
        }, 50);
    }

    goToStep2() {
        const requiredFields = [document.getElementById('prof-firstname'), document.getElementById('prof-lastname')];
        const invalidField = requiredFields.find(field => field && !field.checkValidity());
        if (invalidField) {
            invalidField.focus();
            invalidField.reportValidity();
            return;
        }
        const phoneValidation = this.validatePhone({ showError: true });
        if (!phoneValidation.valid) {
            document.getElementById('prof-phone-national')?.focus();
            return;
        }
        this.clearWebsiteError();
        this.setPhoneError('');
        this.showProfileStep(2);
    }

    clearWebsiteError() {
        const websiteInput = document.getElementById('prof-company-website');
        const error = document.getElementById('prof-company-website-error');
        if (websiteInput) websiteInput.setCustomValidity('');
        if (error) {
            error.textContent = '';
            error.style.display = 'none';
        }
    }

    showWebsiteError(message) {
        const websiteInput = document.getElementById('prof-company-website');
        const error = document.getElementById('prof-company-website-error');
        if (websiteInput) {
            websiteInput.setCustomValidity(message);
            websiteInput.focus();
            websiteInput.reportValidity();
        }
        if (error) {
            error.textContent = message;
            error.style.display = 'block';
        }
    }

    collapseSpaces(value, maxLength) {
        return (value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
    }

    normalizeWebsite(value) {
        const trimmed = (value || '').trim().slice(0, 250);
        if (!trimmed) return '';
        const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
        try {
            const parsed = new URL(withProtocol);
            if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
                throw new Error('Unsupported website protocol');
            }
            return parsed.href;
        } catch (error) {
            this.showWebsiteError('Lütfen geçerli bir web sitesi adresi girin. Örn. https://sirketiniz.com');
            return null;
        }
    }

    getSanitizedProfileFormValues() {
        this.clearWebsiteError();
        const cleanFirst = this.collapseSpaces(document.getElementById('prof-firstname').value, 60);
        const cleanLast = this.collapseSpaces(document.getElementById('prof-lastname').value, 80);
        const safeFullName = this.sanitizeInput(`${cleanFirst} ${cleanLast}`.trim());
        const phoneValidation = this.validatePhone({ showError: true });
        if (!phoneValidation.valid) return null;
        const safePosition = this.sanitizeInput(this.collapseSpaces(document.getElementById('prof-position').value, 100));
        const safeCompanyName = this.sanitizeInput(this.collapseSpaces(document.getElementById('prof-company').value, 140));
        const normalizedWebsite = this.normalizeWebsite(document.getElementById('prof-company-website').value);
        if (normalizedWebsite === null) return null;
        const sectorValue = document.getElementById('prof-sector').value;
        const safeSector = sectorValue && this.allowedSectorValues.has(sectorValue) ? sectorValue : '';

        return {
            cleanFirst,
            safeFullName,
            safePhone: phoneValidation.normalized,
            safePhoneCountry: phoneValidation.countryIso2,
            safePosition,
            safeCompanyName,
            safeCompanyWebsite: this.sanitizeInput(normalizedWebsite),
            safeSector
        };
    }

    focusFirstIncompleteField() {
        const fields = [
            document.getElementById('prof-firstname'),
            document.getElementById('prof-lastname')
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
        this.profileFormDirty = false;
        this.showProfileStep(1);
        this.clearWebsiteError();

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

            if (!this.profileFormDirty) {
                document.getElementById('prof-firstname').value = nameParts[0] || authNameParts.firstName || "";
                document.getElementById('prof-lastname').value = nameParts.slice(1).join(" ") || authNameParts.lastName || "";
                this.loadPhoneValue(profile);
                document.getElementById('prof-position').value = profile.position || "";
                document.getElementById('prof-company').value = profile.companyName || "";
                document.getElementById('prof-company-website').value = profile.companyWebsite || "";
                document.getElementById('prof-sector').value = this.allowedSectorValues.has(profile.sector) ? profile.sector : "";
            }

            const imgPreview = document.getElementById('prof-photo-preview');
            const placeholder = document.getElementById('default-avatar-placeholder');
            const authPhotoURL = this.currentUser.photoURL || "";
            const photoURL = profile.photoURL || authPhotoURL;

            if (!this.profileFormDirty && photoURL) {
                imgPreview.src = photoURL;
                imgPreview.style.display = 'block';
                placeholder.style.display = 'none';
            } else if (!this.profileFormDirty) {
                imgPreview.style.display = 'none';
                placeholder.style.display = 'flex';
                placeholder.textContent = (nameParts[0] || authNameParts.firstName || "U").charAt(0).toUpperCase();
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
            this.showProfileStep(1);
            this.pendingFile = null;
            this.selectedFile = null;
            this.uploadedPhotoURLForRetry = '';
            this.isSavingProfile = false;
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

        if (this.currentStep !== 2) {
            this.goToStep2();
            return;
        }

        const requiredFields = [document.getElementById('prof-firstname'), document.getElementById('prof-lastname')];
        const invalidField = requiredFields.find(field => field && !field.checkValidity());
        if (invalidField) {
            this.showProfileStep(1);
            window.setTimeout(() => {
                invalidField.focus();
                invalidField.reportValidity();
            }, 60);
            return;
        }

        const phoneValidation = this.validatePhone({ showError: true });
        if (!phoneValidation.valid) {
            this.showProfileStep(1);
            window.setTimeout(() => document.getElementById('prof-phone-national')?.focus(), 60);
            return;
        }

        const formValues = this.getSanitizedProfileFormValues();
        if (!formValues) {
            this.showProfileStep(2);
            return;
        }

        const btn = document.getElementById('btn-save-profile');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşleniyor...';
        btn.disabled = true;
        this.isSavingProfile = true;

        try {
            const existingProfile = (this.userData && this.userData.profile) ? this.userData.profile : {};
            const updatePayload = {
                profile: {
                    ...existingProfile,
                    fullName: formValues.safeFullName,
                    phone: formValues.safePhone,
                    phoneCountry: formValues.safePhoneCountry,
                    position: formValues.safePosition,
                    companyName: formValues.safeCompanyName,
                    companyWebsite: formValues.safeCompanyWebsite,
                    sector: formValues.safeSector
                }
            };

            // FOTOĞRAF YÜKLEME (FIREBASE STORAGE)
            if (this.selectedFile && !this.uploadedPhotoURLForRetry) {
                const storageRef = ref(storage, `users/${this.currentUser.uid}/profile_photo.jpg`);
                await uploadBytes(storageRef, this.selectedFile);
                this.uploadedPhotoURLForRetry = await getDownloadURL(storageRef);
            }

            if (this.uploadedPhotoURLForRetry) {
                updatePayload.profile.photoURL = this.uploadedPhotoURLForRetry;
            }

            // Firestore upsert: eksik users/{uid} dokümanını oluşturur, mevcut dokümanda root alanları korur.
            await setDoc(doc(db, "users", this.currentUser.uid), updatePayload, { merge: true });

            this.userData = {
                ...(this.userData || {}),
                profile: {
                    ...existingProfile,
                    ...updatePayload.profile
                }
            };
            this.uploadedPhotoURLForRetry = '';
            this.selectedFile = null;
            this.showSuccessToast();
            this.cancelProfileOnboarding();

            // Ekrandaki UI güncellemeleri
            const finalName = formValues.safeFullName;
            const displayEl = document.getElementById("user-name-display");
            const titleEl = document.getElementById("user-name-title");
            const avatarEl = document.getElementById("user-avatar");

            if(displayEl) displayEl.textContent = finalName;
            if(titleEl) titleEl.textContent = finalName;

            if(avatarEl) {
                const currentPhotoURL = updatePayload.profile.photoURL || existingProfile.photoURL;
                if (currentPhotoURL) {
                    avatarEl.innerHTML = `<img src="${currentPhotoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    // ARKA PLAN DÜZELTMESİ: Fotoğraf yüklendiğinde mor rengi kaldırıyoruz.
                    avatarEl.style.background = 'transparent';
                } else {
                    avatarEl.innerHTML = formValues.cleanFirst.charAt(0).toUpperCase();
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
            this.showProfileStep(2);
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
