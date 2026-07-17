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
                #shared-profile-modal .phone-field-combined { position: relative; display: flex; width: 100%; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: #05080a; transition: border-color 0.2s, box-shadow 0.2s; overflow: visible; }
                #shared-profile-modal .phone-field-combined:focus-within, #shared-profile-modal .phone-field-combined.phone-country-open { border-color: #6366f1; box-shadow: 0 0 0 1px rgba(99,102,241,0.2); }
                #shared-profile-modal .phone-field-combined.phone-field-invalid { border-color: #ef4444; box-shadow: 0 0 0 1px rgba(239,68,68,0.18); }
                #shared-profile-modal .phone-field-combined input { background: transparent !important; border: 0 !important; color: #fff; outline: none; box-sizing: border-box; }
                #shared-profile-modal .phone-country-control { position: relative; flex: 0 0 112px; width: 112px; border-right: 1px solid rgba(255,255,255,0.1); border-radius: 8px 0 0 8px; box-sizing: border-box; }
                #shared-profile-modal #prof-phone-country-trigger { width: 100%; height: 100%; min-height: 43px; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0 11px; background: rgba(255, 255, 255, 0.03); border: 0; border-radius: 8px 0 0 8px; color: #fff; font: inherit; cursor: pointer; text-align: left; transition: 150ms cubic-bezier(0.4, 0, 0.2, 1); }
                #shared-profile-modal #prof-phone-country-trigger:hover, #shared-profile-modal .phone-country-control.is-open #prof-phone-country-trigger { background: rgba(255, 255, 255, 0.05); }
                #shared-profile-modal #prof-phone-country-trigger:focus-visible { outline: none; box-shadow: inset 0 0 0 1px #6366f1, 0 0 0 3px rgba(99, 102, 241, 0.18); }
                #shared-profile-modal #prof-phone-country-display { min-width: 0; overflow: hidden; color: #fff; font-size: 0.82rem; font-weight: 600; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
                #shared-profile-modal #prof-phone-country-trigger .fa-chevron-down { position: static; flex-shrink: 0; width: 1.1rem; color: #9ca3af; font-size: 0.8rem; line-height: 1; pointer-events: none; transition: transform 0.2s ease, color 0.2s ease; }
                #shared-profile-modal .phone-country-control.is-open #prof-phone-country-trigger .fa-chevron-down { color: #6366f1; transform: rotate(180deg); }
                #shared-profile-modal .phone-country-control select { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
                #shared-profile-modal .phone-field-combined input { flex: 1; min-width: 0; border-radius: 0 8px 8px 0; padding: 12px 15px; }
                #shared-profile-modal .profile-phone-country-dropdown { position: fixed; top: 0; left: 0; z-index: 60; width: min(270px, calc(100vw - 32px)); max-height: 372px; box-sizing: border-box; padding: 6px; margin: 0; list-style: none; background: rgba(18, 18, 30, 0.98); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.08); opacity: 0; visibility: hidden; transform: translateY(8px) scale(0.98); transform-origin: bottom left; transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; scrollbar-color: rgba(255, 255, 255, 0.1) #050505; scrollbar-width: auto; -webkit-overflow-scrolling: touch; }
                #shared-profile-modal .profile-phone-country-dropdown.opens-up { transform: translateY(8px) scale(0.98); transform-origin: bottom left; }
                #shared-profile-modal .profile-phone-country-dropdown.opens-down { transform: translateY(-8px) scale(0.98); transform-origin: top left; }
                #shared-profile-modal .profile-phone-country-dropdown.is-open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
                #shared-profile-modal .profile-phone-country-dropdown::-webkit-scrollbar { width: 8px; }
                #shared-profile-modal .profile-phone-country-dropdown::-webkit-scrollbar-track { background: #050505; }
                #shared-profile-modal .profile-phone-country-dropdown::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; border: 2px solid #050505; }
                #shared-profile-modal .profile-phone-country-dropdown::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                #shared-profile-modal .profile-phone-country-option { position: relative; display: flex; align-items: center; gap: 0.65rem; height: 36px; min-height: 36px; box-sizing: border-box; padding: 0 10px; border-radius: 8px; color: #9ca3af; cursor: pointer; font-size: 0.84rem; transition: background 0.18s ease, color 0.18s ease; }
                #shared-profile-modal .profile-phone-country-option:hover, #shared-profile-modal .profile-phone-country-option.is-focused { background: rgba(99, 102, 241, 0.12); color: #fff; }
                #shared-profile-modal .profile-phone-country-option.is-selected { background: rgba(99, 102, 241, 0.12); color: #fff; padding-right: 2.25rem; }
                #shared-profile-modal .profile-phone-country-option.is-selected::after { position: absolute; right: 0.8rem; color: #6366f1; font-family: "Font Awesome 5 Free"; font-size: 0.8rem; font-weight: 900; content: "\f00c"; }
                #shared-profile-modal .profile-phone-country-flag { flex: 0 0 1.1rem; width: 1.1rem; line-height: 1; text-align: center; }
                #shared-profile-modal .profile-phone-country-name { flex: 1; min-width: 0; overflow: hidden; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
                #shared-profile-modal .profile-phone-country-code { flex-shrink: 0; color: #9ca3af; font-size: 0.86rem; }
                @media (max-width: 520px) {
                    #profile-modal-content { width: calc(100% - 24px) !important; padding: 22px !important; }
                    .profile-field-grid { grid-template-columns: 1fr !important; }
                    .profile-step-actions { flex-direction: column !important; }
                    .profile-step-actions button { width: 100% !important; }
                }
                @media (max-width: 390px) {
                    #shared-profile-modal .phone-country-control { flex-basis: 106px; width: 106px; }
                    #shared-profile-modal #prof-phone-country-trigger { padding: 0 9px; }
                    #shared-profile-modal #prof-phone-country-display { font-size: 0.78rem; }
                    #shared-profile-modal .phone-field-combined input { padding: 12px 11px; }
                }
                @media (max-width: 329px) {
                    #shared-profile-modal .phone-field-combined { flex-direction: column; }
                    #shared-profile-modal .phone-country-control { width: 100%; flex-basis: auto; min-height: 43px; border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.1); border-radius: 8px 8px 0 0; }
                    #shared-profile-modal #prof-phone-country-trigger { border-radius: 8px 8px 0 0; }
                    #shared-profile-modal .phone-field-combined input { width: 100%; border-radius: 0 0 8px 8px; }
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
                        <span id="profile-progress-step-2" style="display: inline-flex; align-items: center; gap: 6px; color: #71717a; font-weight: 600;"><span style="display:inline-flex; width:22px; height:22px; border-radius:50%; background:rgba(255,255,255,0.05); align-items:center; justify-content:center;">2</span> Şirket Bilgileri</span>
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
                                <div><label for="prof-phone-national" style="${labelStyle}">Telefon</label><div id="prof-phone-group" class="phone-field-combined"><div class="phone-country-control"><button type="button" id="prof-phone-country-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="prof-phone-country-list"><span id="prof-phone-country-display">TR (+90)</span><i class="fas fa-chevron-down" aria-hidden="true"></i></button><select id="prof-phone-country" aria-label="Ülke telefon kodu" autocomplete="tel-country-code"></select><div id="prof-phone-country-dropdown" class="profile-phone-country-dropdown"><div id="prof-phone-country-list" role="listbox" aria-label="Ülke telefon kodu"></div></div></div><input type="tel" id="prof-phone-national" autocomplete="tel-national" inputmode="numeric" maxlength="28" aria-describedby="prof-phone-error" placeholder="5XX XXX XX XX"></div><p id="prof-phone-error" role="alert" aria-live="polite" style="display:none; color:#ef4444; font-size:0.8rem; margin:6px 0 0; font-family:'Inter Tight', sans-serif;"></p></div>
                                <div><label for="prof-position" style="${labelStyle}">Pozisyon / Ünvan</label><input type="text" id="prof-position" autocomplete="organization-title" maxlength="100" placeholder="Örn. Operasyon Müdürü" style="${fieldStyle}"></div>
                            </div>
                            <div class="profile-step-actions" style="display:flex; justify-content:flex-end; margin-top:25px;"><button type="button" id="btn-profile-next" style="background: #6366f1; color: #fff; border: none; padding: 14px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Devam Et</button></div>
                        </section>

                        <section id="profile-step-2" aria-labelledby="profile-step-2-title" aria-hidden="true" hidden>
                            <h4 id="profile-step-2-title" style="color:#fff; font-family:'Inter Tight', sans-serif; margin:0 0 14px; font-size:1rem;">Şirket Bilgileri</h4>
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
                if (e.target?.closest('.phone-country-control')) return;
                e.preventDefault();
                this.goToStep2();
            }
        });
        document.getElementById('prof-phone-national').addEventListener('input', () => this.formatPhoneInput());
        document.getElementById('prof-phone-national').addEventListener('paste', () => window.setTimeout(() => this.formatPhoneInput(), 0));
        document.getElementById('prof-phone-country').addEventListener('change', () => {
            this.syncPhoneCountryUI();
            this.formatPhoneInput();
        });
        this.bindPhoneCountryDropdown();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                if (this.isPhoneCountryDropdownOpen()) {
                    this.closePhoneCountryDropdown(true);
                    return;
                }
                this.closeModal();
            }
        });

        document.addEventListener('click', (e) => {
            const clickedControl = e.target?.closest?.('.phone-country-control');
            const clickedDropdown = e.target?.closest?.('#prof-phone-country-dropdown');
            if (!clickedControl && !clickedDropdown) this.closePhoneCountryDropdown(false);
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
        if (!countrySelect) return;
        if (countrySelect.options.length) {
            this.syncPhoneCountryUI();
            return;
        }
        countrySelect.innerHTML = PHONE_COUNTRIES.map(country =>
            `<option value="${country.iso2}">${country.flag} ${country.name} (${country.dialCode})</option>`
        ).join('');
        countrySelect.value = DEFAULT_PHONE_COUNTRY;
        const list = document.getElementById('prof-phone-country-list');
        if (list) {
            list.innerHTML = PHONE_COUNTRIES.map((country, index) => `
                <div
                    id="prof-phone-country-option-${country.iso2}"
                    class="profile-phone-country-option"
                    role="option"
                    tabindex="-1"
                    data-iso2="${country.iso2}"
                    data-index="${index}"
                    aria-selected="false"
                >
                    <span class="profile-phone-country-flag" aria-hidden="true">${country.flag}</span>
                    <span class="profile-phone-country-name" title="${country.name}">${country.name}</span>
                    <span class="profile-phone-country-code">${country.dialCode}</span>
                </div>
            `).join('');
        }
        this.phoneCountryFocusedIndex = PHONE_COUNTRIES.findIndex(country => country.iso2 === DEFAULT_PHONE_COUNTRY);
        this.syncPhoneCountryUI();
    }

    syncPhoneCountryUI() {
        const countrySelect = document.getElementById('prof-phone-country');
        const display = document.getElementById('prof-phone-country-display');
        const trigger = document.getElementById('prof-phone-country-trigger');
        const options = Array.from(document.querySelectorAll('#prof-phone-country-list [role="option"]'));
        if (!countrySelect || !display) return;
        const country = this.getPhoneCountry(countrySelect.value);
        countrySelect.value = country.iso2;
        display.textContent = `${country.iso2} (${country.dialCode})`;
        this.updatePhonePlaceholder();
        options.forEach((option, index) => {
            const selected = option.dataset.iso2 === country.iso2;
            option.classList.toggle('is-selected', selected);
            option.classList.toggle('is-focused', selected);
            option.setAttribute('aria-selected', selected ? 'true' : 'false');
            if (selected) this.phoneCountryFocusedIndex = index;
        });
        const focused = options[this.phoneCountryFocusedIndex] || options.find(option => option.dataset.iso2 === country.iso2);
        if (trigger && focused) trigger.setAttribute('aria-activedescendant', focused.id);
    }

    updatePhoneCountryDisplay() {
        this.syncPhoneCountryUI();
    }

    bindPhoneCountryDropdown() {
        const control = document.querySelector('#shared-profile-modal .phone-country-control');
        const trigger = document.getElementById('prof-phone-country-trigger');
        const list = document.getElementById('prof-phone-country-list');
        if (!control || !trigger || !list || control.dataset.dropdownBound === 'true') return;

        control.dataset.dropdownBound = 'true';
        this.phoneCountryTypeahead = '';
        this.phoneCountryTypeaheadTimer = null;
        this.phoneCountryRepositionHandler = () => this.positionPhoneCountryDropdown();

        const dropdown = document.getElementById('prof-phone-country-dropdown');
        const modal = document.getElementById('shared-profile-modal');
        if (dropdown && modal && dropdown.parentElement !== modal) modal.appendChild(dropdown);

        trigger.addEventListener('click', (event) => {
            event.stopPropagation();
            this.togglePhoneCountryDropdown();
        });
        trigger.addEventListener('keydown', (event) => this.handlePhoneCountryKeydown(event));
        list.addEventListener('keydown', (event) => this.handlePhoneCountryKeydown(event));
        list.addEventListener('click', (event) => {
            const option = event.target.closest('[role="option"]');
            if (option) this.selectPhoneCountry(option.dataset.iso2);
        });
        list.addEventListener('mousemove', (event) => {
            const option = event.target.closest('[role="option"]');
            if (option) this.setPhoneCountryFocus(Number(option.dataset.index));
        });
    }

    isPhoneCountryDropdownOpen() {
        return document.querySelector('#shared-profile-modal .phone-country-control')?.classList.contains('is-open');
    }

    togglePhoneCountryDropdown() {
        if (this.isPhoneCountryDropdownOpen()) this.closePhoneCountryDropdown(false);
        else this.openPhoneCountryDropdown();
    }

    openPhoneCountryDropdown() {
        const control = document.querySelector('#shared-profile-modal .phone-country-control');
        const trigger = document.getElementById('prof-phone-country-trigger');
        const dropdown = document.getElementById('prof-phone-country-dropdown');
        const group = document.getElementById('prof-phone-group');
        if (!control || !trigger || !dropdown) return;
        this.syncPhoneCountryUI();
        this.positionPhoneCountryDropdown();
        control.classList.add('is-open');
        dropdown.classList.add('is-open');
        group?.classList.add('phone-country-open');
        trigger.setAttribute('aria-expanded', 'true');
        this.bindPhoneCountryPositionListeners();
        this.setPhoneCountryFocus(this.phoneCountryFocusedIndex || 0);
        this.centerPhoneCountryOption(document.querySelector('#prof-phone-country-list .is-selected'));
    }

    closePhoneCountryDropdown(returnFocus = false) {
        const control = document.querySelector('#shared-profile-modal .phone-country-control');
        const trigger = document.getElementById('prof-phone-country-trigger');
        const dropdown = document.getElementById('prof-phone-country-dropdown');
        const group = document.getElementById('prof-phone-group');
        control?.classList.remove('is-open');
        dropdown?.classList.remove('is-open');
        dropdown?.classList.remove('opens-up', 'opens-down');
        group?.classList.remove('phone-country-open');
        trigger?.setAttribute('aria-expanded', 'false');
        this.unbindPhoneCountryPositionListeners();
        if (returnFocus) trigger?.focus();
    }

    positionPhoneCountryDropdown() {
        const trigger = document.getElementById('prof-phone-country-trigger');
        const dropdown = document.getElementById('prof-phone-country-dropdown');
        if (!trigger || !dropdown) return;

        const triggerRect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const margin = 12;
        const gap = 8;
        const targetWidth = Math.min(270, Math.max(0, viewportWidth - 32));
        const availableAbove = Math.max(0, triggerRect.top - margin - gap);
        const availableBelow = Math.max(0, viewportHeight - triggerRect.bottom - margin - gap);
        const opensDown = availableAbove < 180 && availableBelow > availableAbove;
        const availableSpace = opensDown ? availableBelow : availableAbove;
        const maxHeight = Math.max(0, Math.min(372, availableSpace));
        const width = Math.min(targetWidth, viewportWidth - (margin * 2));
        const left = Math.min(
            Math.max(triggerRect.left, margin),
            Math.max(margin, viewportWidth - width - margin)
        );
        const top = opensDown
            ? Math.min(triggerRect.bottom + gap, viewportHeight - margin - maxHeight)
            : Math.max(margin, triggerRect.top - gap - maxHeight);

        dropdown.style.width = `${width}px`;
        dropdown.style.maxHeight = `${maxHeight}px`;
        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
        dropdown.classList.toggle('opens-up', !opensDown);
        dropdown.classList.toggle('opens-down', opensDown);
    }

    bindPhoneCountryPositionListeners() {
        if (this.phoneCountryPositionListenersBound) return;
        const modalContent = document.getElementById('profile-modal-content');
        window.addEventListener('resize', this.phoneCountryRepositionHandler);
        window.addEventListener('scroll', this.phoneCountryRepositionHandler, true);
        window.addEventListener('orientationchange', this.phoneCountryRepositionHandler);
        modalContent?.addEventListener('scroll', this.phoneCountryRepositionHandler);
        this.phoneCountryPositionListenersBound = true;
    }

    unbindPhoneCountryPositionListeners() {
        if (!this.phoneCountryPositionListenersBound) return;
        const modalContent = document.getElementById('profile-modal-content');
        window.removeEventListener('resize', this.phoneCountryRepositionHandler);
        window.removeEventListener('scroll', this.phoneCountryRepositionHandler, true);
        window.removeEventListener('orientationchange', this.phoneCountryRepositionHandler);
        modalContent?.removeEventListener('scroll', this.phoneCountryRepositionHandler);
        this.phoneCountryPositionListenersBound = false;
    }

    ensurePhoneCountryOptionVisible(option) {
        const dropdown = document.getElementById('prof-phone-country-dropdown');
        if (!dropdown || !option) return;
        const optionTop = option.offsetTop;
        const optionBottom = optionTop + option.offsetHeight;
        const visibleTop = dropdown.scrollTop;
        const visibleBottom = visibleTop + dropdown.clientHeight;
        if (optionTop < visibleTop) dropdown.scrollTop = optionTop;
        else if (optionBottom > visibleBottom) dropdown.scrollTop = optionBottom - dropdown.clientHeight;
    }

    centerPhoneCountryOption(option) {
        const dropdown = document.getElementById('prof-phone-country-dropdown');
        if (!dropdown || !option) return;
        const centeredTop = option.offsetTop - ((dropdown.clientHeight - option.offsetHeight) / 2);
        dropdown.scrollTop = Math.max(0, centeredTop);
        this.ensurePhoneCountryOptionVisible(option);
    }

    setPhoneCountryFocus(index) {
        const options = Array.from(document.querySelectorAll('#prof-phone-country-list [role="option"]'));
        const trigger = document.getElementById('prof-phone-country-trigger');
        if (!options.length) return;
        this.phoneCountryFocusedIndex = Math.max(0, Math.min(index, options.length - 1));
        options.forEach((option, optionIndex) => option.classList.toggle('is-focused', optionIndex === this.phoneCountryFocusedIndex));
        const focused = options[this.phoneCountryFocusedIndex];
        trigger?.setAttribute('aria-activedescendant', focused.id);
        if (this.isPhoneCountryDropdownOpen()) this.ensurePhoneCountryOptionVisible(focused);
    }

    movePhoneCountryFocus(delta) {
        const options = document.querySelectorAll('#prof-phone-country-list [role="option"]');
        if (!options.length) return;
        this.setPhoneCountryFocus(((this.phoneCountryFocusedIndex || 0) + delta + options.length) % options.length);
    }

    selectPhoneCountry(iso2) {
        const countrySelect = document.getElementById('prof-phone-country');
        if (!countrySelect) return;
        countrySelect.value = this.getPhoneCountry(iso2).iso2;
        countrySelect.dispatchEvent(new window.Event('change', { bubbles: true }));
        this.validatePhone({ showError: Boolean(document.getElementById('prof-phone-error')?.textContent) });
        this.closePhoneCountryDropdown(true);
    }

    handlePhoneCountryKeydown(event) {
        const isOpen = this.isPhoneCountryDropdownOpen();
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closePhoneCountryDropdown(true);
            return;
        }
        if (event.key === 'Tab') {
            this.closePhoneCountryDropdown(false);
            return;
        }
        if (['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            if (!isOpen) this.openPhoneCountryDropdown();
            else {
                const focused = document.querySelectorAll('#prof-phone-country-list [role="option"]')[this.phoneCountryFocusedIndex || 0];
                if (focused) this.selectPhoneCountry(focused.dataset.iso2);
            }
            return;
        }
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            if (!isOpen) this.openPhoneCountryDropdown();
            this.movePhoneCountryFocus(event.key === 'ArrowDown' ? 1 : -1);
            return;
        }
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            if (!isOpen) this.openPhoneCountryDropdown();
            this.setPhoneCountryFocus(event.key === 'Home' ? 0 : PHONE_COUNTRIES.length - 1);
            return;
        }
        if (isOpen && event.key.length === 1 && /\S/.test(event.key)) {
            this.handlePhoneCountryTypeahead(event.key);
        }
    }

    handlePhoneCountryTypeahead(char) {
        window.clearTimeout(this.phoneCountryTypeaheadTimer);
        this.phoneCountryTypeahead = `${this.phoneCountryTypeahead || ''}${char}`.toLocaleLowerCase('tr-TR');
        const index = PHONE_COUNTRIES.findIndex(country => country.name.toLocaleLowerCase('tr-TR').startsWith(this.phoneCountryTypeahead));
        if (index >= 0) this.setPhoneCountryFocus(index);
        this.phoneCountryTypeaheadTimer = window.setTimeout(() => {
            this.phoneCountryTypeahead = '';
        }, 700);
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
        this.updatePhoneCountryDisplay();
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
        this.updatePhoneCountryDisplay();
        const national = storedPhone.startsWith('+') ? this.stripDialCode(storedPhone, country) : this.getPhoneDigits(storedPhone);
        input.value = country.iso2 === 'TR' ? this.formatTurkishNational(national) : national;
        this.updatePhonePlaceholder();
        this.setPhoneError('');
    }


    showProfileStep(step) {
        this.closePhoneCountryDropdown(false);
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
        this.closePhoneCountryDropdown(false);
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
        this.closePhoneCountryDropdown(false);
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
