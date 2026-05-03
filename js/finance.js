import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
let trendChart = null;

// O anki ayı YYYY-MM formatında alma
const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Ana Kartın UI'ını Güncelleme
function updateCardUI(history, month) {
    const data = history[month] || { savings: 0, income: 0 };
    
    if (document.getElementById('display-savings')) {
        document.getElementById('display-savings').innerText = `₺${data.savings.toLocaleString('tr-TR')}`;
    }
    if (document.getElementById('display-current-month')) {
        document.getElementById('display-current-month').innerText = month;
    }
    
    const rate = data.income > 0 ? Math.round((data.savings / data.income) * 100) : 0;
    
    if (document.getElementById('display-rate')) {
        document.getElementById('display-rate').innerText = `${rate}%`;
    }
    if (document.getElementById('display-rate-bar')) {
        document.getElementById('display-rate-bar').style.width = `${rate}%`;
    }
}

// 5 YILLIK GENİŞ TREND GRAFİĞİ ÇİZİMİ
function renderLargeChart(history) {
    const months = [];
    const savingsData = [];
    
    // Son 60 ayı oluştur (5 Yıl)
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
        stroke: { curve: 'smooth', width: 3 },
        colors: ['#6366f1'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
        xaxis: { categories: months, labels: { style: { colors: '#71717a' } } },
        yaxis: { labels: { style: { colors: '#71717a' }, formatter: v => `₺${v.toLocaleString()}` } },
        grid: { borderColor: 'rgba(255,255,255,0.05)' },
        theme: { mode: 'dark' }
    };

    if(trendChart) trendChart.destroy();
    
    const chartElement = document.querySelector("#modal-trend-chart-large");
    if(chartElement) {
        trendChart = new ApexCharts(chartElement, options);
        trendChart.render();
        
        // Grafiği en sağa (günümüze) kaydır
        setTimeout(() => {
            const container = document.querySelector('.chart-scroll-container');
            if (container) container.scrollLeft = container.scrollWidth;
        }, 300);
    }
}

// OTURUM VE VERİ ÇEKME YÖNETİMİ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        let history = {};
        let displayName = user.displayName || user.email?.split('@')[0] || "Kullanıcı";

        // Firestore'dan Veri Çekme
        try {
            const snap = await getDoc(userRef);
            if(snap.exists()) {
                const data = snap.data();
                history = data.dashboardStats?.finance?.history || {};
                
                if (data.profile) {
                    displayName = data.profile.fullName || data.profile.companyName || displayName;
                }
            }
            
            if(document.getElementById("user-name-display")) {
                document.getElementById("user-name-display").textContent = displayName;
                document.getElementById("user-avatar").textContent = displayName.charAt(0).toUpperCase();
            }
        } catch (e) { 
            console.error("Veri çekme hatası:", e); 
        }

        window.USER_SESSION = { uid: user.uid, name: displayName, email: user.email };
        if(typeof window.TK_RENDER_SIDEBAR === "function") window.TK_RENDER_SIDEBAR();

        // Kartı ilk açılışta güncelle
        updateCardUI(history, getCurrentMonth());

        // ==========================================
        // MODAL ETKİLEŞİMLERİ
        // ==========================================
        const mainModal = document.getElementById('savings-modal');
        const uploadModal = document.getElementById('upload-modal');
        const monthInput = document.getElementById('input-month');
        const incomeInput = document.getElementById('input-income');
        const savingsInput = document.getElementById('input-savings');

        // Trend Modalı Aç (Birikim Kartına Tıklayınca)
        if (document.getElementById('card-savings')) {
            document.getElementById('card-savings').onclick = () => {
                if(mainModal) mainModal.style.display = 'flex';
                
                if(monthInput) {
                    monthInput.value = getCurrentMonth();
                    const mData = history[monthInput.value] || { income: '', savings: '' };
                    if(incomeInput) incomeInput.value = mData.income || '';
                    if(savingsInput) savingsInput.value = mData.savings || '';
                }
                
                setTimeout(() => renderLargeChart(history), 100);
            };
        }

        // Modal İçi Ay Değiştiğinde Verileri Getir
        if(monthInput) {
            monthInput.addEventListener('change', (e) => {
                const selMonth = e.target.value;
                const mData = history[selMonth] || { income: '', savings: '' };
                if(incomeInput) incomeInput.value = mData.income || '';
                if(savingsInput) savingsInput.value = mData.savings || '';
            });
        }

        // Yükle Butonu (Yükleme Modalını Aç)
        if (document.getElementById('btn-upload-mode')) {
            document.getElementById('btn-upload-mode').onclick = () => { 
                if(mainModal) mainModal.style.display = 'none'; 
                if(uploadModal) uploadModal.style.display = 'flex'; 
            };
        }

        // Modalları Kapatma İşlemleri
        document.querySelectorAll('.tk-center-close, #cancel-upload').forEach(btn => {
            btn.onclick = () => { 
                if(mainModal) mainModal.style.display = 'none'; 
                if(uploadModal) uploadModal.style.display = 'none'; 
            }
        });

        // Verileri Firebase'e Kaydetme İşlemi
        if (document.getElementById('btn-save-savings')) {
            document.getElementById('btn-save-savings').onclick = async () => {
                const m = monthInput?.value;
                const inc = Number(incomeInput?.value || 0);
                const sav = Number(savingsInput?.value || 0);
                
                if(!m) return alert("Lütfen bir ay seçin.");
                
                const saveBtn = document.getElementById('btn-save-savings');
                saveBtn.textContent = "Kaydediliyor...";

                try {
                    const path = `dashboardStats.finance.history.${m}`;
                    await updateDoc(userRef, { [path]: { income: inc, savings: sav } });
                    
                    history[m] = { income: inc, savings: sav };
                    updateCardUI(history, getCurrentMonth());
                    renderLargeChart(history);
                } catch(e) {
                    console.error(e);
                    alert("Kayıt sırasında bir hata oluştu!");
                } finally {
                    saveBtn.textContent = "Değişiklikleri Kaydet";
                }
            };
        }

        // Sayfa yüklendiğinde alt grafikleri çiz ve loading ekranını kaldır
        renderCharts();
        
        const loader = document.getElementById("loading-overlay");
        if (loader) { 
            loader.style.opacity = "0"; 
            setTimeout(() => loader.style.display = "none", 600); 
        }
    } else {
        window.location.href = "/login.html"; // Kullanıcı yoksa logine yönlendir
    }
});

// SIFIRLANMIŞ DEMO GRAFİKLERİ ÇİZME FONKSİYONU
function renderCharts() {
    // Portföy Grafiği
    if(document.querySelector("#chart-main-portfolio")) {
        new ApexCharts(document.querySelector("#chart-main-portfolio"), {
            series: [{ name: 'Portföy', data: [0, 0, 0, 0, 0, 0, 0] }],
            chart: { type: 'line', height: 180, sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 }, colors: ['#a855f7'], tooltip: { theme: 'dark' }
        }).render();
    }

    // Hedef Grafiği
    if(document.querySelector("#chart-radial-target")) {
        new ApexCharts(document.querySelector("#chart-radial-target"), {
            series: [0],
            chart: { type: 'radialBar', height: 160 },
            plotOptions: { radialBar: { hollow: { size: '65%' }, track: { background: 'rgba(255,255,255,0.05)' }, dataLabels: { name: { show: false }, value: { color: '#fff', fontSize: '1.5rem', fontWeight: 700, offsetY: 10 } } } },
            colors: ['#6366f1'], stroke: { lineCap: 'round' }
        }).render();
    }

    // Gider Grafiği
    if(document.querySelector("#chart-expense-spark")) {
        new ApexCharts(document.querySelector("#chart-expense-spark"), {
            series: [{ data: [0, 0, 0, 0, 0, 0] }],
            chart: { type: 'area', height: 60, sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 }, fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
            colors: ['#3b82f6'], tooltip: { fixed: { enabled: false }, marker: { show: false } }
        }).render();
    }
    
    // Donut Varlık Dağılım Grafiği
    if(document.querySelector("#chart-donut-assets")) {
        new ApexCharts(document.querySelector("#chart-donut-assets"), {
            series: [100],
            chart: { type: 'donut', height: 200 },
            labels: ['Veri Yok'],
            colors: ['#1f2233'],
            stroke: { show: true, colors: ['#11131a'], width: 2 },
            legend: { show: false },
            plotOptions: { pie: { donut: { size: '70%', labels: { show: true, name: { color: '#a1a1aa', fontSize: '0.8rem' }, value: { color: '#fff', fontSize: '1.2rem', fontWeight: 700 }, total: { show: true, showAlways: true, label: 'Toplam', color: '#a1a1aa' } } } } },
            dataLabels: { enabled: false }
        }).render();
    }

    // Akış Bar Grafiği
    if(document.querySelector("#chart-bar-savings")) {
        new ApexCharts(document.querySelector("#chart-bar-savings"), {
            series: [{ name: 'Veri Yok', data: [0, 0, 0, 0, 0, 0, 0] }],
            chart: { type: 'bar', height: 220, toolbar: { show: false }, background: 'transparent' },
            plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
            colors: ['#1f2233'],
            dataLabels: { enabled: false },
            xaxis: { categories: ['1', '2', '3', '4', '5', '6', '7'], axisBorder: { show: false }, axisTicks: { show: false }, labels: { show: false } },
            yaxis: { show: false }, grid: { show: false }, legend: { show: false }
        }).render();
    }
}
