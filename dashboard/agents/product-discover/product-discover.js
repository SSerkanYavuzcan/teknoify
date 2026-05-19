// =========================================================
// PRODUCT DISCOVER AJANI - ANA JS DOSYASI
// Dosya Yolu: dashboard/agents/product-discover/product-discover.js
// =========================================================

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"; 

// =========================================================
// API VE YARDIMCI FONKSİYONLAR (HELPERS)
// =========================================================
const PRODUCT_DISCOVER_API_BASE_URL = "https://product-discover-api-duk5clo5oa-uc.a.run.app";
const PRODUCT_DISCOVER_ENDPOINTS = {
    summary: `${PRODUCT_DISCOVER_API_BASE_URL}/dashboard/summary`,
    products: `${PRODUCT_DISCOVER_API_BASE_URL}/products`,
    sources: `${PRODUCT_DISCOVER_API_BASE_URL}/sources`,
    activity: `${PRODUCT_DISCOVER_API_BASE_URL}/dashboard/activity`
};

// Cost-Safety Rules
const PRODUCT_DISCOVER_AUTO_PROCESS_JOBS = false;
const PRODUCT_DISCOVER_SCAN_BATCH_LIMIT = 15; // Timeout'u engellemek için 15 olarak güncellendi

// Global States
window.productDiscoverSources = [];
window.canonicalSourcesMap = new Map(); 
window.allDiscoveredProducts = [];
window.activityTimelineData = [];
window.sourceAutoProcessors = new Map();
window.sourceSummaries = new Map();
window.sourceBatchLocks = new Set();

const escapeHtml = (unsafe) => (unsafe || '').toString().replace(/[&<"'>]/g, (m) => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;','\'': '&#039;'})[m]);
const safeText = (val, fallback = '-') => val ? escapeHtml(val) : fallback;
const formatNumber = (num) => new Intl.NumberFormat('tr-TR').format(num || 0);
const formatPercent = (num) => `%${(num || 0).toFixed(1)}`;
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'}).format(d);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Normalization Functions
const normalizeUrl = (input) => {
    let url = (input || "").trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
        const u = new URL(url);
        let path = u.pathname;
        if (path !== "/") path = path.replace(/\/+$/, "");
        return `${u.protocol}//${u.hostname}${path}`;
    } catch(e) {
        return url.replace(/\/+$/, "");
    }
};

const normalizeDomainFromUrl = (input) => {
    try {
        return new URL(normalizeUrl(input)).hostname.toLowerCase().replace(/^www\./i, '').replace(/\.$/, '');
    } catch(e) { return ""; }
};

const getDomainFromUrl = normalizeDomainFromUrl;

const normalizeText = (value) => {
    return (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
};

const getSourceDomain = (source) => {
    return normalizeDomainFromUrl(source.base_url);
};

const fetchJson = async (url) => {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
};

const postJson = async (url, body) => {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body)
    });
    
    if (!res.ok) {
        let errorDetail = `HTTP ${res.status}`;
        try {
            const errBody = await res.json();
            errorDetail = errBody.detail || errBody.message || errorDetail;
            if(typeof errorDetail === 'object') errorDetail = JSON.stringify(errorDetail);
        } catch(e) {}
        throw new Error(errorDetail);
    }
    return await res.json();
};

const patchJson = async (url, body) => {
    const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
};

const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

const DEFAULT_SITE_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTFhMWFhIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsaW5lIHgxPSIyIiB5MT0iMTIiIHgyPSIyMiIgeTI9IjEyIj48L2xpbmU+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTBhMTUuMyAxNS4zIDAgMCAxLTQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTBhMTUuMyAxNS4zIDAgMCAxIDQtMTB6Ij48L3BhdGg+PC9zdmc+";

// =========================================================
// UI GERİ BİLDİRİM FONKSİYONLARI (Toast & Chatbot)
// =========================================================

window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;
    
    let icon = 'fa-info-circle';
    if(type === 'success') icon = 'fa-check-circle';
    if(type === 'error') icon = 'fa-exclamation-circle';
    if(type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4000);
};

window.addBotMessage = function(text) {
    const container = document.getElementById("chat-container");
    if(!container) return;
    const botMsg = document.createElement("div");
    botMsg.className = "msg system";
    botMsg.innerHTML = `
        <div class="msg-header"><div class="msg-avatar system"><i class="fas fa-robot"></i></div></div>
        <div class="msg-bubble" style="color:#a1a1aa;"><i>${text}</i></div>
    `;
    container.appendChild(botMsg);
    container.scrollTop = container.scrollHeight;
};

// =========================================================
// YENİ KAYNAK EKLEME / SİTEMAP KEŞİF (Güvenli Akış)
// =========================================================

const deriveSourceNameFromUrl = (url) => {
    try {
        let hostname = new URL(url).hostname.replace(/^www\./i, '');
        if (!hostname) return "Yeni Site";
        return hostname.charAt(0).toUpperCase() + hostname.slice(1).split('.')[0];
    } catch(e) { return "Yeni Site"; }
};

window.openAddSourceModal = () => {
    document.getElementById('add-source-url').value = '';
    document.getElementById('add-source-name').value = '';
    document.getElementById('add-source-url').disabled = false;
    document.getElementById('add-source-name').disabled = false;
    
    const statusEl = document.getElementById('add-source-status');
    statusEl.style.display = 'none';
    statusEl.textContent = 'İşlem bekleniyor...';
    statusEl.style.color = '#60a5fa'; 
    
    document.getElementById('btn-submit-source').disabled = false;
    document.getElementById('btn-cancel-source').disabled = false;
    document.getElementById('add-source-modal').style.display = 'flex';
};

window.closeAddSourceModal = () => { document.getElementById('add-source-modal').style.display = 'none'; };

const setModalBusy = (isBusy) => {
    document.getElementById('btn-submit-source').disabled = isBusy;
    document.getElementById('btn-cancel-source').disabled = isBusy;
    document.getElementById('add-source-url').disabled = isBusy;
    document.getElementById('add-source-name').disabled = isBusy;
    document.getElementById('btn-header-add').disabled = isBusy;
};

const updateModalStatus = (msg, type = 'info') => {
    const st = document.getElementById('add-source-status');
    st.style.display = 'block';
    st.textContent = msg;
    if(type === 'error') st.style.color = '#ef4444';
    else if(type === 'success') st.style.color = '#10b981';
    else st.style.color = '#60a5fa';
};

window.submitAddSource = async () => {
    const urlInput = document.getElementById('add-source-url').value;
    const nameInput = document.getElementById('add-source-name').value;
    
    if (!urlInput.trim()) { window.showToast("Lütfen geçerli bir web sitesi adresi girin.", "warning"); return; }
    setModalBusy(true);

    try {
        const normalized = normalizeUrl(urlInput);
        const domainToMatch = normalizeDomainFromUrl(normalized);
        const sourceName = nameInput.trim() || deriveSourceNameFromUrl(normalized);
        
        updateModalStatus("Kaynak kontrol ediliyor...");
        await loadSourcesDataOnly(); 
        
        let matchedDomainKey = null;
        for (let [key, canSrc] of window.canonicalSourcesMap.entries()) {
            if (key === domainToMatch || normalizeText(canSrc.source_name) === normalizeText(sourceName)) {
                matchedDomainKey = key;
                break;
            }
        }

        let sourceId;
        if (matchedDomainKey) {
            window.showToast("Bu site zaten izleniyor. Mevcut kayıt kullanılacak.", "success");
            window.closeAddSourceModal(); 
            loadProductDiscoverDashboard();
            return;
        } else {
            updateModalStatus("Kaynak oluşturuluyor...");
            const sourceRes = await postJson(PRODUCT_DISCOVER_ENDPOINTS.sources, {
                source_name: sourceName,
                source_type: "retailer",
                base_url: normalized,
                country: "TR",
                language: "tr",
                is_active: true,
                priority: 10,
                crawl_frequency_hours: 24,
                robots_policy: "respect",
                notes: "Created from Teknoify Product Discover dashboard"
            });
            sourceId = sourceRes.source_id;
            if (!sourceId) throw new Error("Kaynak oluşturuldu ancak ID alınamadı.");
        }

        updateModalStatus("Sitemap taraması başlatıldı...");
        
        postJson(`${PRODUCT_DISCOVER_API_BASE_URL}/sources/${sourceId}/discover-sitemap`, { 
            max_child_sitemaps: 100, 
            max_sitemaps: 100,
            product_only: true 
        }).catch(e => console.error("Sitemap discovery hatası:", e));
        
        window.showToast("URL keşfi başlatıldı. Ürün çıkarmayı başlatmak için İşlemeyi Başlat butonunu kullanın.", "success");
        
        window.closeAddSourceModal();
        loadProductDiscoverDashboard();

    } catch(e) {
        console.error("Kaynak Ekleme Hatası:", e);
        window.showToast("İşlem sırasında bir hata oluştu.", "error");
        updateModalStatus(`Hata: ${e.message}`, "error");
        setModalBusy(false);
    }
};

// =========================================================
// JOBS MANUEL IŞLEME (PROCESS)
// =========================================================

window.processSourceJobs = async (domainKey) => {
    const canonicalGrp = window.canonicalSourcesMap.get(domainKey);
    if (!canonicalGrp) return;

    const sourceIds = (canonicalGrp.__duplicates || [])
        .map(s => s.source_id)
        .filter(Boolean);

    if (sourceIds.length === 0) {
        window.showToast("Bu kaynak için geçerli source_id bulunamadı.", "error");
        return;
    }

    const displayName = canonicalGrp.source_name || domainKey;

    const btn = document.getElementById(`btn-process-${domainKey}`);
    let originalBtnHtml = "";

    if (btn) {
        originalBtnHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    }

    window.showToast("Ürün çıkarma işleri oluşturuluyor...", "info");

    if (window.addBotMessage) {
        window.addBotMessage(
            `<strong>${escapeHtml(displayName)}</strong> için ürün işleme talebiniz alındı. Arka planda bağlantılar kazınıyor, lütfen işlemin bitmesini bekleyin... ⏳`
        );
    }

    try {
        let allJobIds = [];
        let remainingLimit = PRODUCT_DISCOVER_SCAN_BATCH_LIMIT;

        for (const sourceId of sourceIds) {
            if (remainingLimit <= 0) break;

            const jobsRes = await postJson(
                `${PRODUCT_DISCOVER_API_BASE_URL}/sources/${sourceId}/discovered-urls/create-jobs`,
                {
                    status: "discovered",
                    limit: remainingLimit,
                    priority: "normal",
                    batch_id: `frontend-${sourceId}-${Date.now()}`
                }
            );

            const jobIds = Array.isArray(jobsRes)
                ? jobsRes.map(j => j.job_id || j)
                : (
                    jobsRes.jobs
                        ? jobsRes.jobs.map(j => j.job_id || j)
                        : (
                            jobsRes.items
                                ? jobsRes.items.map(j => j.job_id || j)
                                : jobsRes.job_ids || []
                        )
                );

            if (jobIds.length > 0) {
                allJobIds.push(...jobIds);
                remainingLimit -= jobIds.length;
            }
        }

        if (allJobIds.length > 0) {
            const processCount = Math.min(allJobIds.length, PRODUCT_DISCOVER_SCAN_BATCH_LIMIT);

            window.showToast(`İlk ${processCount} ürün işleniyor, lütfen bekleyin...`, "info");

            await postJson(`${PRODUCT_DISCOVER_API_BASE_URL}/jobs/process-many`, {
                job_ids: allJobIds.slice(0, processCount),
                max_jobs: processCount
            });

            window.showToast("İşleme tamamlandı. Otomatik dışa aktarma hazırlanıyor...", "success");

            if (window.addBotMessage) {
                window.addBotMessage(
                    `✅ <strong>${escapeHtml(displayName)}</strong> için işleme tamamlandı. CSV dosyanız hazırlanıyor.`
                );
            }

            await loadProductDiscoverDashboard();

            setTimeout(() => {
                window.exportSourceProducts(domainKey, true);
            }, 1000);

        } else {
            window.showToast("İşlenecek yeni URL bulunamadı veya işler zaten kuyrukta.", "info");

            if (window.addBotMessage) {
                window.addBotMessage(
                    `ℹ️ <strong>${escapeHtml(displayName)}</strong> için işlenecek yeni URL bulunamadı. URL'ler daha önce kuyruğa alınmış olabilir.`
                );
            }

            if (btn) {
                btn.innerHTML = originalBtnHtml;
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
            }
        }

    } catch (e) {
        console.error("API İşlem Hatası:", e);
        window.showToast(`Hata: ${e.message}`, "error");

        if (window.addBotMessage) {
            window.addBotMessage(
                `❌ <strong>${escapeHtml(displayName)}</strong> için işlem sırasında hata oluştu: ${escapeHtml(e.message)}`
            );
        }

        if (btn) {
            btn.innerHTML = originalBtnHtml;
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
        }
    }
};

// =========================================================
// YENİ ÜRÜNLER KARTI AYARLARI (TÜMÜNÜ SİL & İNDİR)
// =========================================================

window.toggleProductsSettings = () => {
    const menu = document.getElementById('products-settings-menu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
};

document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.widget-settings-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        const menu = document.getElementById('products-settings-menu');
        if (menu) menu.style.display = 'none';
    }
});

window.exportAllProductsGlobal = async () => {
    window.toggleProductsSettings(); 
    window.showToast("Tüm ürünler toparlanıyor, sistemdeki veriler indirilecek...", "info");
    
    try {
        const allProducts = await fetchAllProductsForExport(); 
        
        if (allProducts.length === 0) {
            window.showToast("Sistemde indirilecek ürün bulunamadı.", "warning");
            return;
        }

        const csvContent = buildProductsCsv(allProducts);
        const dateStr = new Date().toISOString().split('T')[0];
        downloadBlob(`product-discover-all-data-${dateStr}.csv`, "\uFEFF" + csvContent, "text/csv;charset=utf-8;");
        window.showToast(`İndirme başlatıldı: Toplam ${allProducts.length} ürün.`, "success");
    } catch(e) {
        console.error("Global Export Hatası:", e);
        window.showToast("Tüm ürünler indirilirken hata oluştu.", "error");
    }
};

// TÜM VERİLERİ SİL (TAM ÇÖZÜMÜ BURASI!)
window.deleteAllSystemData = async () => {
    window.toggleProductsSettings(); 
    
    const userCode = prompt("DİKKAT! Bu işlem sistemdeki TÜM siteleri, url'leri, işleri ve çıkarılan ürünleri kalıcı olarak silecektir.\n\nOnaylamak için 'SIL' yazın:");
    
    if (userCode !== 'SIL' && userCode !== 'sıl' && userCode !== 'sil') {
        window.showToast("Silme işlemi iptal edildi.", "info");
        return;
    }

    window.showToast("Sistemdeki tüm veriler kalıcı olarak siliniyor... Lütfen sayfadan ayrılmayın.", "warning");

    try {
        // DOĞRU VE KESİN ENDPOINT! Swagger arayüzünde ne gördüysek tam olarak o.
        const res = await fetch(`${PRODUCT_DISCOVER_API_BASE_URL}/system/reset`, { method: "DELETE" });
        
        if (!res.ok) {
            throw new Error(`Sunucu Hatası: ${res.status}`);
        }

        window.showToast("Sistem başarıyla sıfırlandı. Ekran yenileniyor...", "success");
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch(e) {
        console.error("Global Silme Hatası:", e);
        window.showToast(`Silme işlemi başarısız oldu: ${e.message}`, "error");
    }
};

// =========================================================
// SİL (DEVRE DIŞI BIRAK), YENİDEN BAŞLAT VE DIŞA AKTAR (CSV)
// =========================================================

window.deleteSourceGroup = async (domainKey) => {
    if (!confirm("Bu kaynağı izlenen sitelerden kaldırmak istiyor musunuz?")) return;
    
    const canonicalGrp = window.canonicalSourcesMap.get(domainKey);
    if (!canonicalGrp) return;

    window.showToast("Kaynak kaldırılıyor...", "info");
    try {
        const allIds = canonicalGrp.__duplicates.map(s => s.source_id);
        await Promise.all(allIds.map(id => 
            patchJson(`${PRODUCT_DISCOVER_ENDPOINTS.sources}/${id}/active`, { is_active: false })
        ));
        
        window.showToast("Kaynak başarıyla kaldırıldı.", "success");
        await loadProductDiscoverDashboard();
    } catch(e) {
        console.error("Silme hatası", e);
        window.showToast("Kaynak silinirken bir hata oluştu.", "error");
    }
};

window.restartSourceGroup = async (domainKey) => {
    if (!confirm("Bu kaynağa ait TÜM veriler (ürünler, işler, url'ler) silinecek ve tarama sıfırdan başlatılacak. Emin misiniz?")) return;
    
    const canonicalGrp = window.canonicalSourcesMap.get(domainKey);
    if (!canonicalGrp) return;

    window.showToast("Eski veriler tamamen siliniyor...", "warning");
    
    try {
        const allIds = canonicalGrp.__duplicates.map(s => s.source_id);
        
        await Promise.all(allIds.map(id => 
            fetch(`${PRODUCT_DISCOVER_ENDPOINTS.sources}/${id}`, { method: "DELETE" })
        ));
        
        window.showToast("Eski veriler temizlendi. Kaynak yeniden oluşturuluyor...", "info");

        const sourceName = canonicalGrp.source_name;
        const baseUrl = canonicalGrp.base_url;
        
        const sourceRes = await postJson(PRODUCT_DISCOVER_ENDPOINTS.sources, {
            source_name: sourceName,
            source_type: "retailer",
            base_url: baseUrl,
            country: "TR",
            language: "tr",
            is_active: true,
            priority: 10,
            crawl_frequency_hours: 24,
            robots_policy: "respect"
        });

        const newSourceId = sourceRes.source_id;

        window.showToast("Yeni sitemap taraması başlatıldı...", "success");
        postJson(`${PRODUCT_DISCOVER_API_BASE_URL}/sources/${newSourceId}/discover-sitemap`, { 
            max_child_sitemaps: 100, 
            max_sitemaps: 100,
            product_only: true 
        }).catch(e => console.error("Sitemap discovery hatası:", e));

        setTimeout(() => {
            loadProductDiscoverDashboard();
        }, 1500);

    } catch(e) {
        console.error("Yeniden başlatma hatası:", e);
        window.showToast("İşlem sırasında bir hata oluştu. Backend silme işlemini desteklemiyor olabilir.", "error");
    }
};

const csvEscape = (value) => {
    if (value === null || value === undefined) return '""';
    let str = String(value).replace(/\r?\n|\r/g, ' '); 
    if (str.includes(',') || str.includes('"')) str = '"' + str.replace(/"/g, '""') + '"';
    return str;
};

const downloadBlob = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 0);
};


window.exportDiscoveredUrlsBySourceId = async (sourceId) => {
    if (!sourceId) {
        window.showToast("Geçerli bir kaynak bulunamadı.", "warning");
        return;
    }

    const limit = 500;
    const maxPages = 20;
    const allItems = [];
    let offset = 0;

    try {
        for (let i = 0; i < maxPages; i++) {
            const res = await fetchJson(`${PRODUCT_DISCOVER_API_BASE_URL}/sources/${sourceId}/discovered-urls?limit=${limit}&offset=${offset}`);
            const items = Array.isArray(res) ? res : (res.items || []);

            if (!Array.isArray(items) || items.length === 0) break;
            allItems.push(...items);

            if (items.length < limit) break;
            offset += limit;
        }

        if (allItems.length === 0) {
            window.showToast("Bu kaynak için keşfedilmiş URL kaydı bulunamadı.", "warning");
            return;
        }

        const headers = [
            "url_id",
            "source_id",
            "url",
            "status",
            "discovery_type",
            "barcode",
            "product_id",
            "first_seen_at",
            "last_seen_at",
            "last_checked_at",
            "error_message"
        ];

        const rows = allItems.map((item) => headers.map((key) => csvEscape(item?.[key] ?? "")).join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        const dateStr = new Date().toISOString().split('T')[0];
        downloadBlob(`product-discover-url-details-${sourceId}-${dateStr}.csv`, "﻿" + csvContent, "text/csv;charset=utf-8;");

        window.showToast(`İndirme başlatıldı: ${formatNumber(allItems.length)} URL kaydı.`, "success");
    } catch (e) {
        console.error("Discovered URL export hatası:", e);
        window.showToast("Detay dışa aktarma sırasında bir hata oluştu.", "error");
    }
};

const productBelongsToSourceGroup = (product, duplicatesArr) => {
    if (!product.evidence || !Array.isArray(product.evidence)) return false;
    
    return duplicatesArr.some(source => {
        const sDomain = getSourceDomain(source);
        const sName = normalizeText(source.source_name);
        return product.evidence.some(ev => {
            const evDomain = normalizeDomainFromUrl(ev.source_url);
            const evName = normalizeText(ev.source_name);
            if (sName && evName === sName) return true;
            if (sDomain && evDomain === sDomain) return true;
            return false;
        });
    });
};

const fetchAllProductsForExport = async () => {
    let allItems = []; let offset = 0; const limit = 500; const maxPages = 20; 
    for (let i = 0; i < maxPages; i++) {
        try {
            const data = await fetchJson(`${PRODUCT_DISCOVER_ENDPOINTS.products}?limit=${limit}&offset=${offset}`);
            const items = data.items || [];
            allItems.push(...items);
            if (items.length < limit) break;
            offset += limit;
        } catch (e) { break; }
    }
    return allItems;
};

const buildProductsCsv = (products) => {
    const headers = ["product_id", "product_name", "barcode", "gtin", "brand", "manufacturer", "category", "status", "confidence_overall", "source_name", "source_url", "image_url", "created_at", "updated_at"];
    const rows = products.map(p => {
        const ev = (p.evidence && p.evidence.length > 0) ? p.evidence[0] : {};
        const conf = (p.confidence && p.confidence.overall) ? p.confidence.overall : '';
        const img = (p.images && p.images.length > 0) ? p.images[0].url : '';
        return [p.product_id, p.product_name, p.barcode, p.gtin, p.brand, p.manufacturer, p.category, p.status, conf, ev.source_name, ev.source_url, img, p.created_at, p.updated_at].map(csvEscape).join(',');
    });
    return [headers.join(','), ...rows].join('\n');
};

window.exportSourceProducts = async (domainKey, force = false) => {
    const canonicalGrp = window.canonicalSourcesMap.get(domainKey);
    
    if (!canonicalGrp || (!canonicalGrp.__stats?.exportable && !force)) {
        window.showToast("Bu kaynak için henüz çıkarılmış ürün bulunamadı. İndirme işlemi için ürün işleme tamamlanmalı.", "warning");
        return;
    }

    const displayName = canonicalGrp.source_name || domainKey;
    window.showToast(`${displayName} için veriler toparlanıyor, dosya indirilecek...`, "info");

    setTimeout(async () => {
        const allProducts = await fetchAllProductsForExport();
        const filteredProducts = allProducts.filter(p => productBelongsToSourceGroup(p, canonicalGrp.__duplicates));

        if (filteredProducts.length === 0) {
            window.showToast("Bu kaynak için çıkarılmış eşleşen ürün bulunamadı.", "warning");
            return;
        }

        const csvContent = buildProductsCsv(filteredProducts);
        const dateStr = new Date().toISOString().split('T')[0];
        const safeName = displayName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        downloadBlob(`product-discover-${safeName}-${dateStr}.csv`, "\uFEFF" + csvContent, "text/csv;charset=utf-8;");
        window.showToast(`İndirme başlatıldı: ${filteredProducts.length} ürün.`, "success");
    }, 100);
};

window.closeSourceProductsModal = () => {
    const modal = document.getElementById('source-products-modal');
    if (modal) modal.style.display = 'none';
};

const getProductPrimaryEvidence = (product) => {
    if (!product?.evidence || !Array.isArray(product.evidence) || product.evidence.length === 0) return {};
    return product.evidence[0] || {};
};

const renderSourceProductsModalContent = (products) => {
    const contentEl = document.getElementById('source-products-content');
    if (!contentEl) return;

    if (!products || products.length === 0) {
        contentEl.innerHTML = `<div class="source-products-empty">Bu kaynak için henüz çıkarılmış ürün bulunamadı.</div>`;
        return;
    }

    contentEl.innerHTML = `
        <table class="source-products-table">
            <thead>
                <tr>
                    <th>Görsel</th>
                    <th>Ürün Adı</th>
                    <th>Kategori</th>
                    <th>Marka</th>
                    <th>Durum</th>
                    <th>Güven</th>
                    <th>Kaynak URL</th>
                    <th>Oluşturulma</th>
                </tr>
            </thead>
            <tbody>
                ${products.map((p) => {
                    const ev = getProductPrimaryEvidence(p);
                    const img = (p.images && p.images.length > 0 && p.images[0]?.url) ? p.images[0].url : '';
                    const conf = typeof p?.confidence?.overall === 'number' ? p.confidence.overall.toFixed(2) : '-';
                    const sourceUrl = ev?.source_url || '-';
                    return `
                        <tr>
                            <td>${img ? `<img class="source-products-thumb" src="${escapeHtml(img)}" alt="Ürün">` : `<div class="pd-product-placeholder" style="width:42px;height:42px;">-</div>`}</td>
                            <td>${safeText(p.product_name)}</td>
                            <td>${safeText(p.category)}</td>
                            <td>${safeText(p.brand)}</td>
                            <td>${safeText(p.status)}</td>
                            <td>${conf}</td>
                            <td>${sourceUrl !== '-' ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;">Bağlantı</a>` : '-'}</td>
                            <td>${formatDate(p.created_at)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
};

window.viewSourceProducts = async (domainKey) => {
    const canonicalGrp = window.canonicalSourcesMap.get(domainKey);
    if (!canonicalGrp) {
        window.showToast("Kaynak bulunamadı.", "warning");
        return;
    }

    const modal = document.getElementById('source-products-modal');
    const titleEl = document.getElementById('source-products-title');
    const subtitleEl = document.getElementById('source-products-subtitle');
    const csvBtn = document.getElementById('source-products-csv-btn');
    const displayName = canonicalGrp.source_name || domainKey;

    titleEl.textContent = displayName;
    subtitleEl.textContent = 'Yükleniyor...';
    renderSourceProductsModalContent([]);
    modal.style.display = 'flex';

    csvBtn.onclick = () => window.exportSourceProducts(domainKey, true);

    try {
        const allProducts = await fetchAllProductsForExport();
        const filteredProducts = allProducts.filter((p) => productBelongsToSourceGroup(p, canonicalGrp.__duplicates));
        subtitleEl.textContent = `${formatNumber(filteredProducts.length)} ürün`;
        renderSourceProductsModalContent(filteredProducts);
    } catch (e) {
        subtitleEl.textContent = '0 ürün';
        renderSourceProductsModalContent([]);
    }
};

// =========================================================
// VERİ ÇEKME VE RENDER FONKSİYONLARI
// =========================================================

async function loadAllProducts() {
    try {
        const data = await fetchJson(`${PRODUCT_DISCOVER_ENDPOINTS.products}?limit=500&offset=0`);
        window.allDiscoveredProducts = data.items || [];
    } catch (e) { window.allDiscoveredProducts = []; }
}

async function loadActivityDataOnly() {
    try {
        const data = await fetchJson(`${PRODUCT_DISCOVER_ENDPOINTS.activity}?limit=100`);
        window.activityTimelineData = data.items || [];
    } catch(e) { window.activityTimelineData = []; }
}

async function loadSourcesDataOnly() {
    try {
        const data = await fetchJson(PRODUCT_DISCOVER_ENDPOINTS.sources);
        window.productDiscoverSources = Array.isArray(data) ? data : (data.items || []);
        
        window.canonicalSourcesMap.clear();
        
        window.productDiscoverSources.forEach(s => {
            if(s.is_active === false) return; 
            
            let domainKey = getSourceDomain(s) || normalizeText(s.source_name);
            if (!domainKey) return; 

            if (!window.canonicalSourcesMap.has(domainKey)) {
                let clone = { ...s, __duplicates: [s] };
                window.canonicalSourcesMap.set(domainKey, clone);
            } else {
                let existing = window.canonicalSourcesMap.get(domainKey);
                existing.__duplicates.push(s);
            }
        });
    } catch(e) { console.error("Kaynaklar alınamadı", e); }
}

async function loadSourceStats() {
    const fetchSourceProcessingSummary = async (sourceId) => {
        return await fetchJson(`${PRODUCT_DISCOVER_API_BASE_URL}/sources/${sourceId}/processing-summary`);
    };
    window.fetchSourceProcessingSummary = fetchSourceProcessingSummary;

    const promises = Array.from(window.canonicalSourcesMap.values()).map(async (canonicalGrp) => {
        let totalUrls = 0; let processed = 0; let failed = 0; let pending = 0;
        
        for (let dup of canonicalGrp.__duplicates) {
            try {
                const summary = await fetchSourceProcessingSummary(dup.source_id);
                totalUrls += Number(summary.total_urls ?? summary.total_candidates ?? 0);
                processed += Number(summary.completed_urls ?? summary.completed_count ?? summary.processed_urls ?? 0);
                failed += Number(summary.failed_urls ?? summary.failed_count ?? summary.not_found_count ?? 0);
                pending += Number(summary.remaining_urls ?? summary.pending_urls ?? summary.discovered_urls ?? 0);
            } catch(e) {}
        }
        
        const pCount = window.allDiscoveredProducts.filter(p => productBelongsToSourceGroup(p, canonicalGrp.__duplicates)).length;
        
        const isRunningSitemap = window.activityTimelineData.some(a => 
            canonicalGrp.__duplicates.some(d => a.source_id === d.source_id || (a.message && a.message.includes(d.source_name))) && 
            a.event_type === 'sitemap_discovery_running'
        );

        const hasRunningJobs = window.activityTimelineData.some(a => 
            canonicalGrp.__duplicates.some(d => a.source_id === d.source_id || (a.message && a.message.includes(d.source_name))) && 
            a.event_type === 'job_running'
        );

        let progress = totalUrls > 0 ? Math.min(100, Math.round((processed / totalUrls) * 100)) : 0;
        let status = 'İşleme bekliyor'; let exportable = false; let processable = false;
        const autoState = window.sourceAutoProcessors.get(getSourceDomain(canonicalGrp) || normalizeText(canonicalGrp.source_name));

        if (isRunningSitemap) {
            status = 'Taranıyor';
        } else if (autoState?.running || hasRunningJobs) {
            status = 'İşleniyor';
        } else if (autoState?.stopped) {
            status = 'Durduruldu';
        } else if (totalUrls === 0) {
            status = 'Beklemede';
        } else if (pending <= 0) {
            status = 'Tamamlandı';
            progress = 100;
            exportable = true;
        } else {
            status = 'İşleme bekliyor';
            processable = true;
            exportable = pCount > 0;
        }
        canonicalGrp.__stats = { totalUrls, processed, failed, pending, progress, status, exportable, processable, pCount };
        window.sourceSummaries.set(getSourceDomain(canonicalGrp) || normalizeText(canonicalGrp.source_name), canonicalGrp.__stats);
    });

    await Promise.all(promises);
}

window.processNextSourceBatch = async (domainKey) => {
    if (window.sourceBatchLocks.has(domainKey)) return;
    const canonicalGrp = window.canonicalSourcesMap.get(domainKey);
    if (!canonicalGrp) return;
    const stats = canonicalGrp.__stats || {};
    if ((stats.pending || 0) <= 0) return;
    window.sourceBatchLocks.add(domainKey);
    try {
        let totalCreated = 0;
        for (const dup of canonicalGrp.__duplicates) {
            const res = await postJson(`${PRODUCT_DISCOVER_API_BASE_URL}/sources/${dup.source_id}/process-next-batch`, {
                batch_size: 20,
                priority: "normal",
                status: "discovered"
            });
            const created = Number(res.created_count || 0);
            totalCreated += created;
            if (created > 0) break;
        }
        await loadProductDiscoverDashboard();
        const refreshed = window.canonicalSourcesMap.get(domainKey)?.__stats;
        if (totalCreated > 0) {
            window.showToast(`${formatNumber(totalCreated)} URL işlendi. Kalan: ${formatNumber(refreshed?.pending || 0)}`, "success");
        } else {
            window.showToast("İşlenecek yeni URL bulunamadı.", "info");
        }
    } catch (e) {
        window.showToast(`Batch işleme hatası: ${e.message}`, "error");
    } finally {
        window.sourceBatchLocks.delete(domainKey);
    }
};

window.startAutoProcessSource = async (domainKey) => {
    const current = window.sourceAutoProcessors.get(domainKey);
    if (current?.running) return;
    window.sourceAutoProcessors.set(domainKey, { running: true, stopped: false });
    window.showToast("Sırayla işleme başlatıldı.", "info");
    while (window.sourceAutoProcessors.get(domainKey)?.running) {
        const group = window.canonicalSourcesMap.get(domainKey);
        const pending = group?.__stats?.pending || 0;
        if (pending <= 0) {
            window.sourceAutoProcessors.set(domainKey, { running: false, stopped: false });
            break;
        }
        await window.processNextSourceBatch(domainKey);
        if (!window.sourceAutoProcessors.get(domainKey)?.running) break;
        const jitterMs = 1500 + Math.floor(Math.random() * 1000);
        await sleep(jitterMs);
    }
    await loadProductDiscoverDashboard();
};

window.stopAutoProcessSource = (domainKey) => {
    const current = window.sourceAutoProcessors.get(domainKey);
    if (!current) return;
    window.sourceAutoProcessors.set(domainKey, { running: false, stopped: true });
    window.showToast("Sırayla işleme durduruldu.", "warning");
    loadProductDiscoverDashboard();
};

function renderSources() {
    const tbody = document.getElementById('sources-table-body');
    if (window.canonicalSourcesMap.size === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="pd-live-empty">İzlenen site bulunamadı.</td></tr>`;
        return;
    }
    
    const htmlRows = [];
    for (let [domainKey, canGrp] of window.canonicalSourcesMap.entries()) {
        const domain = getSourceDomain(canGrp) || domainKey;
        const stats = canGrp.__stats || { progress: 0, status: 'Aktif', exportable: false, processable: false };
        
        let statusClass = 'waiting';
        if (['Taranıyor', 'İşleniyor', 'Hazırlanıyor', 'İşleme bekliyor', 'Kısmi hazır'].includes(stats.status)) statusClass = 'scanning';
        else if (stats.status === 'Tamamlandı') statusClass = 'scanning'; 

        let logoSrc = DEFAULT_SITE_SVG;
        if (domain && domain.includes('.') && domain.length > 4 && !domain.includes(' ')) {
            logoSrc = `https://logo.clearbit.com/${domain}`;
        }

        const remaining = Math.max(0, Number(stats.pending || 0));
        let actionsHtml = '';
        actionsHtml += `<button class="btn-view-products" onclick="window.viewSourceProducts('${domainKey}')" title="Ürünleri Gör"><i class="fas fa-eye"></i></button>`;
        if (stats.exportable) {
            actionsHtml += `<button class="btn-download-csv" onclick="window.exportSourceProducts('${domainKey}')" title="Ürünleri indir"><i class="fas fa-download"></i></button>`;
        } else {
            actionsHtml += `<span style="font-size:0.75rem; color:#71717a; margin-left:6px;" title="İndirme için hazır değil"><i class="fas fa-hourglass-half"></i></span>`;
        }
        
        actionsHtml += `<button class="btn-process-jobs btn-process-text" ${remaining <= 0 ? 'disabled' : ''} onclick="window.processNextSourceBatch('${domainKey}')" title="Sonraki 20 ürünü işle">Sonraki 20 ürünü işle</button>`;
        actionsHtml += `<button class="btn-process-jobs btn-process-text" ${remaining <= 0 || window.sourceAutoProcessors.get(domainKey)?.running ? 'disabled' : ''} onclick="window.startAutoProcessSource('${domainKey}')" title="Tümünü sırayla işle">Tümünü sırayla işle</button>`;
        actionsHtml += `<button class="btn-process-jobs btn-process-text btn-stop" ${!window.sourceAutoProcessors.get(domainKey)?.running ? 'disabled' : ''} onclick="window.stopAutoProcessSource('${domainKey}')" title="Durdur">Durdur</button>`;

        actionsHtml += `<button class="btn-process-jobs" style="color:#f59e0b; border-color:rgba(245,158,11,0.2); background:rgba(245,158,11,0.1);" onclick="window.restartSourceGroup('${domainKey}')" title="Sıfırla ve Yeniden Başlat"><i class="fas fa-sync-alt"></i></button>`;

        actionsHtml += `<button class="btn-delete-source" onclick="window.deleteSourceGroup('${domainKey}')" title="Kaynağı Kaldır"><i class="fas fa-trash"></i></button>`;

        const metricsText = `${formatNumber(stats.totalUrls)} URL · ${formatNumber(stats.processed)} işlendi · ${formatNumber(remaining)} bekliyor${stats.failed ? ` · ${formatNumber(stats.failed)} hatalı` : ''}`;
        let progressHtml = `
        <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:0.75rem; color:#a1a1aa;">${metricsText}</div>
            <div style="display:flex; align-items:center; gap:8px;">
                <div class="progress-track" style="width: 70px; margin:0;"><div class="progress-fill" style="width: ${stats.progress}%;"></div></div> 
                <span style="min-width:30px; font-size:0.8rem;">%${stats.progress}</span>
                <span style="font-size:0.75rem; color:#cbd5e1;">Kalan: ${formatNumber(remaining)}</span>
                ${actionsHtml}
            </div>
        </div>`;

        htmlRows.push(`
        <tr>
            <td>
                <div class="site-cell">
                    <div class="site-icon"><img src="${logoSrc}" onerror="this.onerror=null; this.src='${DEFAULT_SITE_SVG}';" alt="icon"></div> 
                    ${escapeHtml(canGrp.source_name || domain)}
                </div>
            </td>
            <td class="status-text ${statusClass}"><i class="fas fa-circle" style="font-size:6px; margin-right:4px;"></i> ${stats.status}</td>
            <td>${safeText(canGrp.priority)}</td>
            <td style="color:#a1a1aa;">${safeText(canGrp.country)} / ${safeText(canGrp.language)}</td>
            <td>${progressHtml}</td>
        </tr>
        `);
    }
    tbody.innerHTML = htmlRows.join('');
}

function renderCategories() {
    const chart = document.getElementById('categories-chart');
    const totalEl = document.getElementById('categories-total');
    
    if (window.allDiscoveredProducts.length === 0) {
        chart.innerHTML = `<div class="pd-live-empty">Henüz kategori verisi yok.</div>`;
        totalEl.textContent = '0';
        return;
    }

    const categoryCounts = {};
    window.allDiscoveredProducts.forEach(p => {
        const catName = (p.category && p.category.trim() !== "") ? p.category.trim() : "Kategorisiz";
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    const sortedCategories = Object.keys(categoryCounts)
        .map(key => ({ label: key, count: categoryCounts[key] }))
        .sort((a, b) => b.count - a.count);

    const topCategories = sortedCategories.slice(0, 7);
    const maxCount = topCategories.length > 0 ? topCategories[0].count : 1;

    chart.innerHTML = topCategories.map(c => {
        const widthPct = Math.max(2, Math.round((c.count / maxCount) * 100));
        return `
            <div class="h-bar-row">
                <div class="h-bar-label" title="${escapeHtml(c.label)}">${escapeHtml(c.label)}</div>
                <div class="h-bar-track">
                    <div class="h-bar-fill" style="width: ${widthPct}%;"></div>
                </div>
                <div class="h-bar-val">${formatNumber(c.count)}</div>
            </div>
        `;
    }).join('');

    totalEl.textContent = formatNumber(window.allDiscoveredProducts.length);
}

async function loadSummary() {
    try {
        const sum = await fetchJson(PRODUCT_DISCOVER_ENDPOINTS.summary);
        
        setText('kpi-sessions', formatNumber(sum.jobs?.running_jobs));
        setText('kpi-sessions-sub', `Bekleyen: ${formatNumber(sum.jobs?.pending_jobs)}`);
        setText('kpi-sites', formatNumber(window.canonicalSourcesMap.size || sum.sources?.active_sources));
        setText('kpi-sites-sub', `Gerçek Tekil Site`);
        setText('kpi-products', formatNumber(sum.products?.products_today || sum.products?.total_products));
        setText('kpi-products-sub', `Toplam: ${formatNumber(sum.products?.total_products)}`);
        setText('kpi-success', formatPercent(sum.jobs?.success_rate));
        setText('kpi-success-sub', `Hata: ${formatNumber(sum.jobs?.failed_jobs)}`);

        const isRunning = (sum.jobs?.running_jobs || 0) > 0;
        const liveStatusEl = document.getElementById('live-agent-status');
        liveStatusEl.textContent = isRunning ? "Tarama Devam Ediyor" : "Beklemede";
        liveStatusEl.className = isRunning ? "widget-title-badge active" : "widget-title-badge";
        
        const setAgentIdle = () => {
            setText('live-current-site-name', 'Aktif İş Yok');
            setText('live-current-source-context', 'Ajan hazır durumda bekliyor.');
            document.getElementById('live-current-site-icon').src = DEFAULT_SITE_SVG;
        };

        if (sum.latest_run) {
            const sourceId = sum.latest_run.source_id;
            let matchedGroup = null;

            if (sourceId) {
                for (let grp of window.canonicalSourcesMap.values()) {
                    if (grp.__duplicates.some(d => d.source_id === sourceId)) {
                        matchedGroup = grp; 
                        break;
                    }
                }
            }

            if (matchedGroup) {
                let sourceDomain = getSourceDomain(matchedGroup);
                let displayName = matchedGroup.source_name || sourceDomain;

                setText('live-current-site-name', displayName);

                const iconEl = document.getElementById('live-current-site-icon');
                if (sourceDomain && sourceDomain.includes('.') && sourceDomain.length > 4 && !sourceDomain.includes(' ')) {
                    iconEl.src = `https://logo.clearbit.com/${sourceDomain}`;
                    iconEl.onerror = () => { iconEl.onerror = null; iconEl.src = DEFAULT_SITE_SVG; };
                } else {
                    iconEl.src = DEFAULT_SITE_SVG;
                }

                const contextEl = document.getElementById('live-current-source-context');
                if (contextEl) {
                    const contextText = `Durum: ${safeText(sum.latest_run.status)} · ${formatNumber(sum.latest_run.products_found || 0)} Ürün URL · ${formatNumber(sum.latest_run.pages_seen || 0)} Sayfa`;
                    contextEl.innerHTML = `${contextText} <button onclick="window.exportDiscoveredUrlsBySourceId('${escapeHtml(sourceId)}')" style="margin-left:8px; padding:2px 10px; border-radius:999px; border:1px solid rgba(139,92,246,0.45); background:rgba(139,92,246,0.15); color:#c4b5fd; font-size:0.75rem; line-height:1.4; cursor:pointer;">Detay Gör</button>`;
                }
            } else {
                setAgentIdle();
            }
        } else {
            setAgentIdle();
        }

        const total = sum.jobs?.total_jobs || 0;
        const completed = sum.jobs?.completed_jobs || 0;
        const pending = sum.jobs?.pending_jobs || 0;
        const running = sum.jobs?.running_jobs || 0;
        const fillEl = document.getElementById('overall-progress-fill');

        if (running === 0) {
            fillEl.style.width = `100%`;
            fillEl.style.backgroundColor = '#10b981'; 
            
            setText('overall-progress-label', `Hazır`);
            setText('overall-progress-detail', `Şu an aktif bir işlem yok. (Toplam Keşfedilen: ${formatNumber(completed)})`);
        } else {
            const processed = total - pending - running;
            const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0;
            
            fillEl.style.width = `${progressPct}%`;
            fillEl.style.backgroundColor = ''; 
            
            setText('overall-progress-label', `${progressPct}%`);
            setText('overall-progress-detail', `İşleniyor: ${formatNumber(processed)} / ${formatNumber(total)}`);
        }
        
    } catch (e) {
        console.error("Summary API Hatası:", e);
    }
}

function renderActivityTimeline() {
    const list = document.getElementById('activity-timeline');
    const activities = window.activityTimelineData.slice(0, 10);
    
    if (activities.length === 0) {
        list.innerHTML = `<li class="timeline-item"><div class="timeline-text pd-live-empty">Aktivite bulunamadı.</div></li>`;
        return;
    }
    list.innerHTML = activities.map(item => {
        let iconCls = "green"; let faCls = "fa-circle";
        switch(item.event_type) {
            case 'source_created': iconCls="blue"; faCls="fa-globe"; break;
            case 'sitemap_discovery_completed': iconCls="green"; faCls="fa-play"; break;
            case 'sitemap_discovery_failed': iconCls="red"; faCls="fa-exclamation-triangle"; break;
            case 'sitemap_discovery_running': iconCls="yellow"; faCls="fa-spinner fa-spin"; break;
            case 'job_completed': iconCls="purple"; faCls="fa-check"; break;
            case 'job_running': iconCls="yellow"; faCls="fa-spinner fa-spin"; break;
            case 'job_failed': iconCls="red"; faCls="fa-exclamation-triangle"; break;
            case 'product_discovered': iconCls="green"; faCls="fa-cube"; break;
        }
        return `
        <li class="timeline-item">
            <div class="timeline-icon ${iconCls}"><i class="fas ${faCls}"></i></div>
            <div class="timeline-text">
                <strong style="color: #e4e4e7;">${safeText(item.title)}</strong><br>
                <span style="color:#a1a1aa; font-size: 0.75rem;">${safeText(item.message)}</span>
                <div style="color:#71717a; font-size: 0.65rem; margin-top:2px;">${formatDate(item.event_time)}</div>
            </div>
        </li>
        `;
    }).join('');
}

async function loadProductsTable() {
    const tbody = document.getElementById('products-table-body');
    try {
        const data = await fetchJson(`${PRODUCT_DISCOVER_ENDPOINTS.products}?limit=10&offset=0`);
        const products = data.items || [];
        
        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="pd-live-empty">Henüz ürün keşfedilmedi.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = products.map(p => {
            let imgUrl = p.images && p.images.length > 0 ? p.images[0].url : '';
            let imgHtml = imgUrl ? `<img src="${escapeHtml(imgUrl)}" class="product-img" alt="ürün">` : `<div class="product-img pd-product-placeholder"><i class="fas fa-box"></i></div>`;
            
            let domain = "Bilinmiyor";
            if (p.evidence && p.evidence.length > 0) {
                domain = normalizeDomainFromUrl(p.evidence[0].source_url) || p.evidence[0].source_name;
            }
            
            let confScore = p.confidence && p.confidence.overall ? formatPercent(p.confidence.overall * 100) : '%0';
            
            return `
            <tr>
                <td>
                    <div class="product-name-cell">
                        ${imgHtml}
                        <span title="${safeText(p.product_name)}" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeText(p.product_name)}</span>
                    </div>
                </td>
                <td style="color:#a1a1aa;">${safeText(p.category)}</td>
                <td>${escapeHtml(domain)}</td>
                <td style="color:#fff;">${safeText(p.status)}</td>
                <td><span class="trust-score">${confScore}</span></td>
                <td style="color:#a1a1aa;">${formatDate(p.created_at)}</td>
            </tr>
            `;
        }).join('');
    } catch (e) {
        console.error("Products API Hatası:", e);
        tbody.innerHTML = `<tr><td colspan="6" class="pd-live-error">Veri alınamadı</td></tr>`;
    }
}

async function loadProductDiscoverDashboard() {
    await loadSourcesDataOnly();
    await loadActivityDataOnly();
    await loadAllProducts();
    
    await loadSourceStats(); 

    renderSources();
    renderCategories();
    renderActivityTimeline();

    await Promise.all([
        loadSummary(),
        loadProductsTable()
    ]);
}

// =========================================================
// FIREBASE AUTH & İLK YÜKLEME (INIT)
// =========================================================

const auth = getAuth();
const db = getFirestore(); 
const CURRENT_AGENT_ID = "product-discover";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            window.location.href = "/dashboard/member.html";
            return;
        }

        const rootData = userDocSnap.data() || {};
        const userData = rootData.data || rootData || {};
        
        let name = user.displayName || user.email.split('@')[0] || "Kullanıcı";
        if (userData.profile && userData.profile.fullName) name = userData.profile.fullName;

        document.getElementById("user-name-display").textContent = name;
        document.getElementById("chat-user-name").textContent = name;

        const avatarEl = document.getElementById("user-avatar");
        if (userData.profile && userData.profile.photoURL) {
            avatarEl.innerHTML = `<img src="${userData.profile.photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            avatarEl.style.background = 'transparent';
        } else {
            avatarEl.innerHTML = name.charAt(0).toUpperCase();
        }

        const agentAccess = userData.agentAccess || rootData.agentAccess || {};
        const roleType = (userData.role && typeof userData.role === 'object') ? userData.role.type : (userData.role || 'member');
        const idTokenResult = await user.getIdTokenResult();
        const isAdmin = idTokenResult.claims.admin || roleType === 'admin';

        if (!isAdmin && agentAccess[CURRENT_AGENT_ID] !== true) {
            window.location.href = "/dashboard/member.html"; 
            return;
        }

        window.USER_SESSION = { uid: user.uid, name: name, email: user.email, isAdmin: isAdmin };
        if(typeof window.TK_RENDER_SIDEBAR === "function") window.TK_RENDER_SIDEBAR();
        
        document.getElementById("agent-main-view").style.opacity = "1";
        
        loadProductDiscoverDashboard();
    } else {
        window.location.href = "/"; 
    }
});

// =========================================================
// CHAT (SOHBET) SİMÜLASYONU
// =========================================================

window.sendMessage = function() {
    const input = document.getElementById("agent-input");
    const text = input.value.trim();
    if(!text) return;

    const container = document.getElementById("chat-container");
    const userMsg = document.createElement("div");
    userMsg.className = "msg user";
    userMsg.innerHTML = `<div class="msg-bubble">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
    container.appendChild(userMsg);
    
    input.value = "";
    input.style.height = "20px";
    container.scrollTop = container.scrollHeight;

    setTimeout(() => {
        const botMsg = document.createElement("div");
        botMsg.className = "msg system";
        botMsg.innerHTML = `
            <div class="msg-header"><div class="msg-avatar system"><i class="fas fa-robot"></i></div></div>
            <div class="msg-bubble" style="color:#a1a1aa;"><i>Veriler analiz ediliyor, lütfen bekleyin...</i></div>
        `;
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
    }, 500);
};
