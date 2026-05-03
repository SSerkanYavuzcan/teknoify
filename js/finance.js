import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
let trendChart = null;
let selectedFile = null;
let currentEditingMonth = null;

// Global State
let globalHistory = {};
let globalTargetRate = 35; // Default Hedef
let currentChartRange = '12'; // Default Filtre (12A)

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
        if (str.indexOf(',') > str.indexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
        else str = str.replace(/,/g, '');
    } else if (str.includes(',')) str = str.replace(',', '.');
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

function updateSummaryCards(history, rangeMonthsArray) {
    let totalIncome = 0;
    let totalSavings = 0;
    let currentMonthSav = 0;
    
    const currentM = getCurrentMonth();
    if (history[currentM]) currentMonthSav = history[currentM].savings;

    rangeMonthsArray.forEach(key => {
        const d = history[key];
        if (d) {
            totalIncome += (d.income || 0);
            totalSavings += (d.savings || 0);
        }
    });

    const avgRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0;
    let targetSuccess = 0;
    if (globalTargetRate > 0) {
        targetSuccess = Math.round((avgRate / globalTargetRate) * 100);
        if (targetSuccess > 100) targetSuccess = 100;
    }

    if (document.getElementById('total-savings-val')) document.getElementById('total-savings-val').innerText = `₺${totalSavings.toLocaleString('tr-TR')}`;
    if (document.getElementById('current-month-savings-val')) document.getElementById('current-month-savings-val').innerText = `₺${currentMonthSav.toLocaleString('tr-TR')}`;
    if (document.getElementById('avg-savings-rate')) document.getElementById('avg-savings-rate').innerText = `%${avgRate}`;
    if (document.getElementById('target-success-rate')) document.getElementById('target-success-rate').innerText = `%${targetSuccess}`;
}

// Filtreye göre ay listesini oluşturan fonksiyon
function getFilteredMonths(range) {
    const months = [];
    const d = new Date();
    
    let count = 12;
    if (range === '3') count = 3;
    else if (range === '6') count = 6;
    else if (range === '12') count = 12;
    else if (range === 'all') count = 60; // 5 yıl
    else if (range === 'ytd') count = d.getMonth() + 1;

    for(let i = count - 1; i >= 0; i--) {
        const tempD = new Date();
        tempD.setMonth(tempD.getMonth() - i);
        months.push(`${tempD.getFullYear()}-${String(tempD.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
}

// ==========================================
// KARMA (MIXED) GRAFİK ÇİZİMİ
// ==========================================
function renderLargeChart(history, range) {
    const months = getFilteredMonths(range);
    const incomeData = [];
    const savingsData = [];
    const rateData = [];
    
    months.forEach(mStr => {
        const mData = history[mStr] || { income: 0, savings: 0 };
        incomeData.push(mData.income);
        savingsData.push(mData.savings);
        const rate = mData.income > 0 ? ((mData.savings / mData.income) * 100).toFixed(1) : 0;
        rateData.push(rate);
    });

    updateSummaryCards(history, months);

    // Genişlik ayarlaması (Tümü seçilirse scroll açılsın, diğerlerinde tam sığsın)
    const chartWrapper = document.getElementById('dynamic-chart-width');
    if(chartWrapper) {
        if(range === 'all') chartWrapper.style.minWidth = '2500px';
        else chartWrapper.style.minWidth = '100%';
    }

    const options = {
        series: [
            { name: 'Aylık Gelir', type: 'column', data: incomeData },
            { name: 'Birikim Miktarı', type: 'column', data: savingsData },
            { name: 'Tasarruf Oranı (%)', type: 'line', data: rateData }
        ],
        chart: {
            height: 400,
            type: 'line',
            stacked: false,
            toolbar: { show: false },
            zoom: { enabled: false },       // Yakınlaştırmayı Kapattık
            selection: { enabled: false },  // Seçim alanını kapattık
            background: 'transparent',
            events: {
                dataPointSelection: (event, chartContext, config) => {
                    const isManualMode = document.getElementById('btn-manual-mode')?.classList.contains('active');
                    if (!isManualMode) return; // Sadece Manuel moddaysa açılsın
                    
                    const monthIdx = config.dataPointIndex;
                    const selectedMonth = months[monthIdx];
                    openMiniPopup(event, selectedMonth, history[selectedMonth]);
                }
            }
        },
        stroke: { width: [0, 0, 4], curve: 'smooth' },
        plotOptions: { 
            bar: { 
                columnWidth: range === 'all' ? '60%' : '40%', 
                borderRadius: 4 
            } 
        },
        colors: ['#3b82f6', '#4f46e5', '#10b981'], // Net renkler
        fill: { opacity: [1, 1, 1] }, // Sütunlar solid
        labels: months,
        markers: { size: 5, hover: { size: 8 } },
        yaxis: [
            { title: { text: "Tutar (₺)", style: { color: '#a1a1aa' } }, labels: { style: { colors: '#71717a' }, formatter: v => `₺${v.toLocaleString('tr-TR')}` } },
            { show: false }, // İkinci sütun için gizli
            { opposite: true, max: 100, title: { text: "Oran (%)", style: { color: '#10b981' } }, labels: { style: { colors: '#10b981' }, formatter: v => `%${v}` } }
        ],
        xaxis: { labels: { style: { colors: '#71717a' } }, tooltip: { enabled: false } },
        grid: { borderColor: 'rgba(255,255,255,0.05)' },
        theme: { mode: 'dark' },
        tooltip: { shared: true, intersect: false, theme: 'dark' },
        annotations: {
            yaxis: [{
                y: globalTargetRate,
                yAxisIndex: 2, // Tasarruf Oranı Eksenine bağlanır (Index 2)
                borderColor: '#ef4444',
                strokeDashArray: 5,
                label: {
                    borderColor: 'transparent',
                    style: { color: '#ef4444', background: 'transparent', fontWeight: 600 },
                    text: `Hedef %${globalTargetRate}`,
                    position: 'left',
                    offsetX: 10
                }
            }]
        }
    };

    if(trendChart) trendChart.destroy();
    const chartElement = document.querySelector("#modal-trend-chart-large");
    if(chartElement) {
        trendChart = new ApexCharts(chartElement, options);
        trendChart.render();
        setTimeout(() => {
            const container = document.querySelector('.chart-scroll-container');
            if (container && range === 'all') container.scrollLeft = container.scrollWidth;
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
    document.getElementById('mini-input-target').value = globalTargetRate;
    calculateMiniRate();

    popup.style.display = 'block';
    
    let posX = event.clientX - 150;
    let posY = event.clientY - 280;
    
    if(posX < 10) posX = 10;
    if(posY < 10) posY = 10;
    
    popup.style.left = posX + 'px';
    popup.style.top = posY + 'px';
}

function calculateMiniRate() {
    const inc = Number(document.getElementById('mini-input-income')?.value || 0);
    const sav = Number(document.getElementById('mini-input-savings')?.value || 0);
    const rateInput = document.getElementById('mini-input-rate');
    
    if(rateInput) {
        if (inc > 0) rateInput.value = `%${((sav / inc) * 100).toFixed(1)}`;
        else rateInput.value = '%0';
    }
}

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
    let displayName = user.displayName || user.email?.split('@')[0] || "Kullanıcı";

    try {
        const snap = await getDoc(userRef);
        if(snap.exists()) {
            const data = snap.data();
            globalHistory = data.dashboardStats?.finance?.history || {};
            globalTargetRate = data.dashboardStats?.finance?.targetRate || 35; // Hedefi çek
            if (data.profile) displayName = data.profile.fullName || data.profile.companyName || displayName;
        }
        if(document.getElementById("user-name-display")) {
            document.getElementById("user-name-display").textContent = displayName;
            document.getElementById("user-avatar").textContent = displayName.charAt(0).toUpperCase();
        }
    } catch (e) { console.error(e); }

    window.USER_SESSION = { uid: user.uid, name: displayName, email: user.email };
    if(typeof window.TK_RENDER_SIDEBAR === "function") window.TK_RENDER_SIDEBAR();

    updateCardUI(globalHistory, getCurrentMonth());

    // --- MODALLAR ---
    const mainModal = document.getElementById('savings-modal');
    const uploadModal = document.getElementById('upload-modal');
    
    if (document.getElementById('card-savings')) {
        document.getElementById('card-savings').onclick = () => {
            if(mainModal) mainModal.style.display = 'flex';
            setTimeout(() => renderLargeChart(globalHistory, currentChartRange), 100);
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
        }
    });

    // --- FİLTRE BUTONLARI ---
    document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChartRange = e.target.getAttribute('data-range');
            renderLargeChart(globalHistory, currentChartRange);
        };
    });

    // --- MİNİ POPUP GÜNCELLE BUTONU (FIREBASE) ---
    if (document.getElementById('btn-save-mini')) {
        document.getElementById('btn-save-mini').onclick = async () => {
            const inc = parseTurkishFloat(document.getElementById('mini-input-income')?.value);
            const sav = parseTurkishFloat(document.getElementById('mini-input-savings')?.value);
            const target = parseTurkishFloat(document.getElementById('mini-input-target')?.value);
            
            if (currentEditingMonth) {
                const btn = document.getElementById('btn-save-mini');
                btn.textContent = "Kaydediliyor...";
                try {
                    globalTargetRate = target; // Globali güncelle
                    const path = `dashboardStats.finance.history.${currentEditingMonth}`;
                    
                    await updateDoc(userRef, { 
                        [path]: { income: inc, savings: sav },
                        'dashboardStats.finance.targetRate': globalTargetRate // Hedefi veritabanına yaz
                    });
                    
                    globalHistory[currentEditingMonth] = { income: inc, savings: sav };
                    updateCardUI(globalHistory, getCurrentMonth());
                    renderLargeChart(globalHistory, currentChartRange);
                    
                    document.getElementById('mini-edit-popup').style.display = 'none';
                } catch(e) { 
                    alert("Kayıt sırasında hata oluştu."); 
                } finally { 
                    btn.textContent = "Güncelle"; 
                }
            }
        };
    }

    // --- DOSYA YÜKLEME ---
    if (document.getElementById('btn-download-template')) {
        document.getElementById('btn-download-template').onclick = () => {
            const format = document.getElementById('template-format')?.value || 'xlsx';
            const templateData = [{ Date: "2026-01", Income: 30000, Savings: 5000 }];
            if(typeof XLSX !== 'undefined') {
                const worksheet = XLSX.utils.json_to_sheet(templateData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Sablon");
                XLSX.writeFile(workbook, `teknoify_birikim_sablonu.${format}`);
            }
        };
    }

    const dropZone = document.getElementById('upload-drag-zone');
    const fileInput = document.getElementById('file-upload-input');
    const confirmBtn = document.getElementById('btn-confirm-upload');

    if (dropZone && fileInput) {
        dropZone.onclick = () => fileInput.click();
        dropZone.ondrop = (e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
        };
        fileInput.onchange = (e) => { if(e.target.files.length > 0) handleFileSelect(e.target.files[0]); };
    }

    function handleFileSelect(file) {
        selectedFile = file;
        const nameLabel = document.getElementById('upload-file-name');
        if(nameLabel) nameLabel.innerHTML = `<strong style="color:#fff;">${file.name}</strong> seçildi.`;
        if(confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = "1"; confirmBtn.style.cursor = "pointer"; }
    }

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            if (!selectedFile) return;
            confirmBtn.textContent = "İşleniyor..."; confirmBtn.disabled = true;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

                    const payload = {};
                    json.forEach(row => {
                        let dStr = String(row.Date || row.date || row.Tarih || row.tarih).trim();
                        if (/^\d{4}-\d{2}$/.test(dStr)) {
                            let parsedInc = parseTurkishFloat(row.Income || row.income || row.Gelir || row.gelir);
                            let parsedSav = parseTurkishFloat(row.Savings || row.savings || row.Birikim || row.birikim);
                            payload[`dashboardStats.finance.history.${dStr}`] = { income: parsedInc, savings: parsedSav };
                            globalHistory[dStr] = { income: parsedInc, savings: parsedSav };
                        }
                    });

                    if (Object.keys(payload).length > 0) {
                        await updateDoc(userRef, payload);
                        updateCardUI(globalHistory, getCurrentMonth());
                        renderLargeChart(globalHistory, currentChartRange);
                        alert("Veriler başarıyla aktarıldı!");
                        document.getElementById('upload-modal').style.display = 'none';
                    }
                } catch (error) { alert("Dosya işlenirken bir hata oluştu."); } 
                finally { confirmBtn.textContent = "Dosyayı Yükle"; confirmBtn.disabled = false; selectedFile = null; }
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
