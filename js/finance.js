import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
let trendChart = null;
let selectedFile = null;
let currentEditingMonth = null;

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================
const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const parseTurkishFloat = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let str = String(val).trim();
    
    if (str.includes(',') && str.includes('.')) {
        if (str.indexOf(',') > str.indexOf('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    return parseFloat(str) || 0;
};

// ==========================================
// ARAYÜZ (UI) GÜNCELLEMELERİ
// ==========================================
function updateCardUI(history, month) {
    const data = history[month] || { savings: 0, income: 0 };
    if (document.getElementById('display-savings')) document.getElementById('display-savings').innerText = `₺${data.savings.toLocaleString('tr-TR')}`;
    if (document.getElementById('display-current-month')) document.getElementById('display-current-month').innerText = month;
    
    const rate = data.income > 0 ? Math.round((data.savings / data.income) * 100) : 0;
    if (document.getElementById('display-rate')) document.getElementById('display-rate').innerText = `${rate}%`;
    if (document.getElementById('display-rate-bar')) document.getElementById('display-rate-bar').style.width = `${rate}%`;
}

// Alt Scorecard (Özet) Güncellemesi
function updateSummaryCards(history) {
    let totalIncome = 0;
    let totalSavings = 0;
    let maxSavings = 0;
    let monthCount = 0;

    // Sadece son 1 yılın (12 ay) ortalamasını almak için mantık
    const keys = Object.keys(history).sort().reverse();
    const last12Keys = keys.slice(0, 12);
    
    let last12Income = 0;
    let last12Savings = 0;

    Object.keys(history).forEach(key => {
        const d = history[key];
        if (d.income > 0 || d.savings > 0) {
            totalIncome += d.income;
            totalSavings += d.savings;
            if (d.savings > maxSavings) maxSavings = d.savings;
            monthCount++;
            
            if(last12Keys.includes(key)) {
                last12Income += d.income;
                last12Savings += d.savings;
            }
        }
    });

    const avgRate = last12Income > 0 ? ((last12Savings / last12Income) * 100).toFixed(1) : 0;

    if (document.getElementById('avg-savings-rate')) document.getElementById('avg-savings-rate').innerText = `%${avgRate}`;
    if (document.getElementById('max-savings-val')) document.getElementById('max-savings-val').innerText = `₺${maxSavings.toLocaleString('tr-TR')}`;
    if (document.getElementById('total-income-val')) document.getElementById('total-income-val').innerText = `₺${totalIncome.toLocaleString('tr-TR')}`;
}

// ==========================================
// KARMA (MIXED) GRAFİK ÇİZİMİ
// ==========================================
function renderLargeChart(history) {
    const months = [];
    const incomeData = [];
    const savingsData = [];
    const rateData = [];
    
    for(let i = 59; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(mStr);
        
        const mData = history[mStr] || { income: 0, savings: 0 };
        incomeData.push(mData.income);
        savingsData.push(mData.savings);
        
        const rate = mData.income > 0 ? ((mData.savings / mData.income) * 100).toFixed(1) : 0;
        rateData.push(rate);
    }

    const options = {
        series: [
            { name: 'Aylık Gelir', type: 'column', data: incomeData },
            { name: 'Birikim Miktarı', type: 'column', data: savingsData },
            { name: 'Tasarruf Oranı (%)', type: 'line', data: rateData }
        ],
        chart: {
            height: 450,
            type: 'line',
            stacked: false,
            toolbar: { show: false },
            background: 'transparent',
            events: {
                // Grafikteki bir noktaya veya sütuna tıklandığında pop-up aç
                dataPointSelection: (event, chartContext, config) => {
                    const monthIdx = config.dataPointIndex;
                    const selectedMonth = months[monthIdx];
                    openMiniPopup(event, selectedMonth, history[selectedMonth]);
                }
            }
        },
        stroke: { width: [0, 0, 4], curve: 'smooth' },
        plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
        colors: ['#3b82f6', '#6366f1', '#10b981'],
        fill: { opacity: [0.85, 0.85, 1] },
        labels: months,
        markers: { size: 5, hover: { size: 8 } },
        yaxis: [
            { title: { text: "Tutar (₺)", style: { color: '#a1a1aa' } }, labels: { style: { colors: '#71717a' }, formatter: v => `₺${v.toLocaleString('tr-TR')}` } },
            { show: false }, // Birikim sütunu için ikinci Y eksenini gizle, ilkiyle aynı skalayı kullansın
            { opposite: true, title: { text: "Oran (%)", style: { color: '#10b981' } }, labels: { style: { colors: '#10b981' }, formatter: v => `%${v}` } }
        ],
        xaxis: { labels: { style: { colors: '#71717a' } }, tooltip: { enabled: false } },
        grid: { borderColor: 'rgba(255,255,255,0.05)' },
        theme: { mode: 'dark' },
        tooltip: { shared: true, intersect: false, theme: 'dark' }
    };

    if(trendChart) trendChart.destroy();
    
    const chartElement = document.querySelector("#modal-trend-chart-large");
    if(chartElement) {
        trendChart = new ApexCharts(chartElement, options);
        trendChart.render();
        setTimeout(() => {
            const container = document.querySelector('.chart-scroll-container');
            if (container) container.scrollLeft = container.scrollWidth;
        }, 300);
    }
}

// ==========================================
// MINI POPUP MANTIĞI
// ==========================================
function openMiniPopup(event, monthStr, data) {
    const popup = document.getElementById('mini-edit-popup');
    if (!popup) return;

    currentEditingMonth = monthStr;

    document.getElementById('popup-month-title').innerText = monthStr;
    document.getElementById('mini-input-income').value = data?.income || 0;
    document.getElementById('mini-input-savings').value = data?.savings || 0;
    calculateMiniRate();

    popup.style.display = 'block';
    
    // Basit bir ekran taşma kontrolü ile popup'ı mouse'un yanına yerleştirme
    let posX = event.clientX - 130;
    let posY = event.clientY - 250;
    
    if(posX < 10) posX = 10;
    if(posY < 10) posY = 10;
    
    popup.style.left = posX + 'px';
    popup.style.top = posY + 'px';
}

function calculateMiniRate() {
    const incInput = document.getElementById('mini-input-income');
    const savInput = document.getElementById('mini-input-savings');
    const rateInput = document.getElementById('mini-input-rate');
    
    if(!incInput || !savInput || !rateInput) return;

    const inc = Number(incInput.value);
    const sav = Number(savInput.value);
    
    if (inc > 0) {
        rateInput.value = `%${((sav / inc) * 100).toFixed(1)}`;
    } else {
        rateInput.value = '%0';
    }
}

// Mini Popup Olay Dinleyicileri
const miniInc = document.getElementById('mini-input-income');
const miniSav = document.getElementById('mini-input-savings');
const miniClose = document.getElementById('close-mini-popup');

if (miniInc) miniInc.oninput = calculateMiniRate;
if (miniSav) miniSav.oninput = calculateMiniRate;
if (miniClose) miniClose.onclick = () => document.getElementById('mini-edit-popup').style.display = 'none';

// ==========================================
// ANA OTURUM VE OLAY DİNLEYİCİLERİ
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "/login.html";

    const userRef = doc(db, "users", user.uid);
    let history = {};
    let displayName = user.displayName || user.email?.split('@')[0] || "Kullanıcı";

    try {
        const snap = await getDoc(userRef);
        if(snap.exists()) {
            const data = snap.data();
            history = data.dashboardStats?.finance?.history || {};
            if (data.profile) displayName = data.profile.fullName || data.profile.companyName || displayName;
        }
        if(document.getElementById("user-name-display")) {
            document.getElementById("user-name-display").textContent = displayName;
            document.getElementById("user-avatar").textContent = displayName.charAt(0).toUpperCase();
        }
    } catch (e) { console.error(e); }

    window.USER_SESSION = { uid: user.uid, name: displayName, email: user.email };
    if(typeof window.TK_RENDER_SIDEBAR === "function") window.TK_RENDER_SIDEBAR();

    updateCardUI(history, getCurrentMonth());
    updateSummaryCards(history);

    // --- MODALLAR ---
    const mainModal = document.getElementById('savings-modal');
    const uploadModal = document.getElementById('upload-modal');
    
    if (document.getElementById('card-savings')) {
        document.getElementById('card-savings').onclick = () => {
            if(mainModal) mainModal.style.display = 'flex';
            setTimeout(() => renderLargeChart(history), 100);
        };
    }

    if (document.getElementById('btn-upload-mode')) {
        document.getElementById('btn-upload-mode').onclick = () => { 
            if(mainModal) mainModal.style.display = 'none'; 
            if(uploadModal) uploadModal.style.display = 'flex'; 
        };
    }

    document.querySelectorAll('.tk-center-close, #cancel-upload').forEach(btn => {
        btn.onclick = () => { 
            if(mainModal) mainModal.style.display = 'none'; 
            if(uploadModal) uploadModal.style.display = 'none';
            if(document.getElementById('mini-edit-popup')) document.getElementById('mini-edit-popup').style.display = 'none';
            
            selectedFile = null;
            if(document.getElementById('upload-file-name')) document.getElementById('upload-file-name').textContent = "Dosyayı seçmek için tıklayın veya sürükleyip bırakın";
            if(document.getElementById('upload-drag-zone')) document.getElementById('upload-drag-zone').style.borderColor = "rgba(255,255,255,0.2)";
            
            const confirmBtn = document.getElementById('btn-confirm-upload');
            if(confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = "0.5";
                confirmBtn.style.cursor = "not-allowed";
            }
        }
    });

    // --- MİNİ POPUP GÜNCELLE BUTONU (FIREBASE) ---
    if (document.getElementById('btn-save-mini')) {
        document.getElementById('btn-save-mini').onclick = async () => {
            const inc = parseTurkishFloat(document.getElementById('mini-input-income')?.value);
            const sav = parseTurkishFloat(document.getElementById('mini-input-savings')?.value);
            
            if (currentEditingMonth) {
                const btn = document.getElementById('btn-save-mini');
                btn.textContent = "Kaydediliyor...";
                try {
                    const path = `dashboardStats.finance.history.${currentEditingMonth}`;
                    await updateDoc(userRef, { [path]: { income: inc, savings: sav } });
                    
                    history[currentEditingMonth] = { income: inc, savings: sav };
                    updateCardUI(history, getCurrentMonth());
                    updateSummaryCards(history);
                    renderLargeChart(history);
                    
                    document.getElementById('mini-edit-popup').style.display = 'none';
                } catch(e) { 
                    alert("Kayıt sırasında hata oluştu."); 
                } finally { 
                    btn.textContent = "Güncelle"; 
                }
            }
        };
    }

    // --- DOSYA YÜKLEME VE ŞABLON İNDİRME ---
    if (document.getElementById('btn-download-template')) {
        document.getElementById('btn-download-template').onclick = () => {
            const formatSelect = document.getElementById('template-format');
            const format = formatSelect ? formatSelect.value : 'xlsx';
            
            const templateData = [
                { Date: "2026-01", Income: 30000, Savings: 5000 },
                { Date: "2026-02", Income: 32000, Savings: 6000 },
                { Date: "2026-03", Income: 35000.50, Savings: 7500.75 }
            ];
            
            if(typeof XLSX !== 'undefined') {
                const worksheet = XLSX.utils.json_to_sheet(templateData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Sablon");
                XLSX.writeFile(workbook, `teknoify_birikim_sablonu.${format}`);
            } else {
                alert("Dosya indirme kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.");
            }
        };
    }

    const dropZone = document.getElementById('upload-drag-zone');
    const fileInput = document.getElementById('file-upload-input');
    const confirmBtn = document.getElementById('btn-confirm-upload');

    if (dropZone && fileInput) {
        dropZone.onclick = () => fileInput.click();
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = "#6366f1"; };
        dropZone.ondragleave = (e) => { e.preventDefault(); dropZone.style.borderColor = "rgba(255,255,255,0.2)"; };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "rgba(255,255,255,0.2)";
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        };
        fileInput.onchange = (e) => {
            if(e.target.files.length > 0) handleFileSelect(e.target.files[0]);
        };
    }

    function handleFileSelect(file) {
        const validExtensions = ['csv', 'xlsx', 'xls'];
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(ext)) {
            alert("Lütfen sadece CSV veya Excel dosyası yükleyin.");
            return;
        }

        selectedFile = file;
        const nameLabel = document.getElementById('upload-file-name');
        if(nameLabel) nameLabel.innerHTML = `<strong style="color:#fff;">${file.name}</strong> seçildi.`;
        dropZone.style.borderColor = "#10b981";
        
        if(confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = "1";
            confirmBtn.style.cursor = "pointer";
        }
    }

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            if (!selectedFile) return;
            
            confirmBtn.textContent = "İşleniyor...";
            confirmBtn.disabled = true;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

                    const payload = {};

                    json.forEach(row => {
                        let dStr = row.Date || row.date || row.Tarih || row.tarih;
                        let incVal = row.Income || row.income || row.Gelir || row.gelir;
                        let savVal = row.Savings || row.savings || row.Birikim || row.birikim;

                        if (dStr) {
                            dStr = String(dStr).trim();
                            if (/^\d{4}-\d{2}$/.test(dStr)) {
                                let parsedInc = parseTurkishFloat(incVal);
                                let parsedSav = parseTurkishFloat(savVal);
                                
                                payload[`dashboardStats.finance.history.${dStr}`] = { income: parsedInc, savings: parsedSav };
                                history[dStr] = { income: parsedInc, savings: parsedSav };
                            }
                        }
                    });

                    if (Object.keys(payload).length > 0) {
                        await updateDoc(userRef, payload);
                        updateCardUI(history, getCurrentMonth());
                        updateSummaryCards(history);
                        renderLargeChart(history);
                        alert("Veriler başarıyla aktarıldı ve kaydedildi!");
                        uploadModal.style.display = 'none';
                    } else {
                        alert("Dosyada geçerli (YYYY-MM) formatında tarih veya veri bulunamadı.");
                    }
                } catch (error) {
                    console.error(error);
                    alert("Dosya işlenirken bir hata oluştu.");
                } finally {
                    confirmBtn.textContent = "Dosyayı Yükle";
                    confirmBtn.disabled = false;
                    selectedFile = null;
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        };
    }

    renderCharts();
    const loader = document.getElementById("loading-overlay");
    if (loader) { loader.style.opacity = "0"; setTimeout(() => loader.style.display = "none", 600); }
});

function renderCharts() {
    if(document.querySelector("#chart-main-portfolio")) new ApexCharts(document.querySelector("#chart-main-portfolio"), { series: [{ name: 'Portföy', data: [0, 0, 0, 0, 0, 0, 0] }], chart: { type: 'line', height: 180, sparkline: { enabled: true } }, stroke: { curve: 'smooth', width: 2 }, colors: ['#a855f7'], tooltip: { theme: 'dark' } }).render();
    if(document.querySelector("#chart-radial-target")) new ApexCharts(document.querySelector("#chart-radial-target"), { series: [0], chart: { type: 'radialBar', height: 160 }, plotOptions: { radialBar: { hollow: { size: '65%' }, track: { background: 'rgba(255,255,255,0.05)' }, dataLabels: { name: { show: false }, value: { color: '#fff', fontSize: '1.5rem', fontWeight: 700, offsetY: 10 } } } }, colors: ['#6366f1'], stroke: { lineCap: 'round' } }).render();
    if(document.querySelector("#chart-expense-spark")) new ApexCharts(document.querySelector("#chart-expense-spark"), { series: [{ data: [0, 0, 0, 0, 0, 0] }], chart: { type: 'area', height: 60, sparkline: { enabled: true } }, stroke: { curve: 'smooth', width: 2 }, fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } }, colors: ['#3b82f6'], tooltip: { fixed: { enabled: false }, marker: { show: false } } }).render();
    if(document.querySelector("#chart-donut-assets")) new ApexCharts(document.querySelector("#chart-donut-assets"), { series: [100], chart: { type: 'donut', height: 200 }, labels: ['Veri Yok'], colors: ['#1f2233'], stroke: { show: true, colors: ['#11131a'], width: 2 }, legend: { show: false }, plotOptions: { pie: { donut: { size: '70%', labels: { show: true, name: { color: '#a1a1aa', fontSize: '0.8rem' }, value: { color: '#fff', fontSize: '1.2rem', fontWeight: 700 }, total: { show: true, showAlways: true, label: 'Toplam', color: '#a1a1aa' } } } } }, dataLabels: { enabled: false } }).render();
    if(document.querySelector("#chart-bar-savings")) new ApexCharts(document.querySelector("#chart-bar-savings"), { series: [{ name: 'Veri Yok', data: [0, 0, 0, 0, 0, 0, 0] }], chart: { type: 'bar', height: 220, toolbar: { show: false }, background: 'transparent' }, plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } }, colors: ['#1f2233'], dataLabels: { enabled: false }, xaxis: { categories: ['1', '2', '3', '4', '5', '6', '7'], axisBorder: { show: false }, axisTicks: { show: false }, labels: { show: false } }, yaxis: { show: false }, grid: { show: false }, legend: { show: false } }).render();
}
