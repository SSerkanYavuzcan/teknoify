import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
let trendChart = null;
let selectedFile = null; // Yüklenecek dosyayı tutar

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================
const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Akıllı Sayı Dönüştürücü (10.000,50 veya 1322,60 formatlarını JS standardına çevirir)
const parseTurkishFloat = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let str = String(val).trim();
    
    // Hem nokta hem virgül varsa (örn: 10.000,50 veya 1,000.50)
    if (str.includes(',') && str.includes('.')) {
        if (str.indexOf(',') > str.indexOf('.')) {
            // TR formatı: 10.000,50 -> noktayı sil, virgülü nokta yap
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // US formatı: 10,000.50 -> virgülü sil
            str = str.replace(/,/g, '');
        }
    } 
    // Sadece virgül varsa (örn: 1322,60)
    else if (str.includes(',')) {
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

function renderLargeChart(history) {
    const months = [];
    const savingsData = [];
    
    for(let i = 59; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(mStr);
        savingsData.push(history[mStr] ? history[mStr].savings : 0);
    }

    const options = {
        series: [{ name: 'Birikim', data: savingsData }],
        chart: { type: 'area', height: 450, toolbar: { show: false }, animations: { enabled: false } },
        stroke: { curve: 'smooth', width: 3 }, colors: ['#6366f1'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
        xaxis: { categories: months, labels: { style: { colors: '#71717a' } } },
        yaxis: { labels: { style: { colors: '#71717a' }, formatter: v => `₺${v.toLocaleString()}` } },
        grid: { borderColor: 'rgba(255,255,255,0.05)' }, theme: { mode: 'dark' }
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

    // --- MODALLAR ---
    const mainModal = document.getElementById('savings-modal');
    const uploadModal = document.getElementById('upload-modal');
    
    // Trend Modalı Açılış
    if (document.getElementById('card-savings')) {
        document.getElementById('card-savings').onclick = () => {
            if(mainModal) mainModal.style.display = 'flex';
            const mInp = document.getElementById('input-month');
            if(mInp) {
                mInp.value = getCurrentMonth();
                const mData = history[mInp.value] || { income: '', savings: '' };
                document.getElementById('input-income').value = mData.income || '';
                document.getElementById('input-savings').value = mData.savings || '';
            }
            setTimeout(() => renderLargeChart(history), 100);
        };
    }

    // Modal İçi Ay Değişimi
    const monthInput = document.getElementById('input-month');
    if(monthInput) {
        monthInput.addEventListener('change', (e) => {
            const mData = history[e.target.value] || { income: '', savings: '' };
            document.getElementById('input-income').value = mData.income || '';
            document.getElementById('input-savings').value = mData.savings || '';
        });
    }

    // Manuel Kaydet Butonu
    if (document.getElementById('btn-save-savings')) {
        document.getElementById('btn-save-savings').onclick = async () => {
            const m = monthInput?.value;
            if(!m) return alert("Lütfen bir ay seçin.");
            const inc = parseTurkishFloat(document.getElementById('input-income')?.value);
            const sav = parseTurkishFloat(document.getElementById('input-savings')?.value);
            
            const btn = document.getElementById('btn-save-savings');
            btn.textContent = "Kaydediliyor...";
            try {
                await updateDoc(userRef, { [`dashboardStats.finance.history.${m}`]: { income: inc, savings: sav } });
                history[m] = { income: inc, savings: sav };
                updateCardUI(history, getCurrentMonth());
                renderLargeChart(history);
            } catch(e) { alert("Hata oluştu."); } 
            finally { btn.textContent = "Değişiklikleri Kaydet"; }
        };
    }

    // --- DOSYA YÜKLEME MODALI ETKİLEŞİMLERİ ---
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
            // Yükleme alanını sıfırla
            selectedFile = null;
            document.getElementById('upload-file-name').textContent = "Dosyayı seçmek için tıklayın veya sürükleyip bırakın";
            document.getElementById('upload-drag-zone').style.borderColor = "rgba(255,255,255,0.2)";
            document.getElementById('btn-confirm-upload').disabled = true;
            document.getElementById('btn-confirm-upload').style.opacity = "0.5";
            document.getElementById('btn-confirm-upload').style.cursor = "not-allowed";
        }
    });

    // 1. Şablon İndirme İşlemi (SheetJS ile)
    if (document.getElementById('btn-download-template')) {
        document.getElementById('btn-download-template').onclick = () => {
            const format = document.getElementById('template-format').value;
            const templateData = [
                { Date: "2026-01", Income: 30000, Savings: 5000 },
                { Date: "2026-02", Income: 32000, Savings: 6000 },
                { Date: "2026-03", Income: 35000.50, Savings: 7500.75 }
            ];
            
            // SheetJS ile sayfa yaratımı
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sablon");
            XLSX.writeFile(workbook, `teknoify_birikim_sablonu.${format}`);
        };
    }

    // 2. Sürükle Bırak / Dosya Seçme Alanı
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
        document.getElementById('upload-file-name').innerHTML = `<strong style="color:#fff;">${file.name}</strong> seçildi. Yüklemek için butona basın.`;
        dropZone.style.borderColor = "#10b981"; // Yeşil renk
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
        confirmBtn.style.cursor = "pointer";
    }

    // 3. Dosyayı Yükle ve Firebase'i Güncelle İşlemi
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
                    // İlk sayfayı al
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    // raw: false ile verileri text olarak okumaya çalışır (Tarih formatlarını korumak için)
                    const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

                    const payload = {};

                    json.forEach(row => {
                        // Olası kolon isimlerini tolere et
                        let dStr = row.Date || row.date || row.Tarih || row.tarih;
                        let incVal = row.Income || row.income || row.Gelir || row.gelir;
                        let savVal = row.Savings || row.savings || row.Birikim || row.birikim;

                        if (dStr) {
                            dStr = String(dStr).trim();
                            // Basit bir regex kontrolü: YYYY-MM formatında mı?
                            if (/^\d{4}-\d{2}$/.test(dStr)) {
                                let parsedInc = parseTurkishFloat(incVal);
                                let parsedSav = parseTurkishFloat(savVal);
                                
                                payload[`dashboardStats.finance.history.${dStr}`] = { income: parsedInc, savings: parsedSav };
                                history[dStr] = { income: parsedInc, savings: parsedSav };
                            }
                        }
                    });

                    // Eğer yüklenecek geçerli bir veri varsa
                    if (Object.keys(payload).length > 0) {
                        await updateDoc(userRef, payload);
                        
                        // Ekranları Güncelle
                        updateCardUI(history, getCurrentMonth());
                        renderLargeChart(history);
                        
                        alert("Veriler başarıyla aktarıldı ve kaydedildi!");
                        uploadModal.style.display = 'none';
                    } else {
                        alert("Dosyada geçerli (YYYY-MM) formatında tarih veya veri bulunamadı. Lütfen şablonu kontrol edin.");
                    }
                } catch (error) {
                    console.error("Dosya okuma/yazma hatası:", error);
                    alert("Dosya işlenirken bir hata oluştu.");
                } finally {
                    confirmBtn.textContent = "Dosyayı Yükle";
                    confirmBtn.disabled = false;
                    selectedFile = null;
                }
            };
            
            // Okumayı Başlat
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
