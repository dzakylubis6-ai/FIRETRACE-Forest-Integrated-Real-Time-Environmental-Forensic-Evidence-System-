// Konfigurasi Deskripsi Status (Skala Regional Kalimantan)
const statusConfig = {
    "NORMAL": { class: "normal", desc: "Pemantauan regional rutin. Distribusi sensor di seluruh titik pantau Kalimantan menunjukkan data baseline normal.", t: 27, h: 82, s: 400, uv: 0 },
    "WASPADA": { class: "waspada", desc: "Peningkatan frekuensi sampling di sektor tertentu. Tren anomali awal terdeteksi.", t: 29, h: 70, s: 850, uv: 0 },
    "SIAGA": { class: "siaga", desc: "Sinyal peringatan dikirim. Drone verifikasi siaga untuk memantau area anomali di Kalimantan.", t: 31, h: 60, s: 1500, uv: 50 },
    "BAHAYA": { class: "bahaya", desc: "Perekaman krisis dimulai. Otoritas penanggulangan bencana daerah disiagakan.", t: 33, h: 50, s: 3500, uv: 150 },
    "AWAS": { class: "awas", desc: "Penguncian hash aktif. Draf Laporan Forensik Regional disusun secara real-time.", t: 35, h: 45, s: 6000, uv: 250 }
};

let fireChart; // Variabel global untuk grafik
let currentTargetTemp = 27; // Target suhu saat ini untuk animasi
let currentTargetHum = 82;  // Target kelembapan saat ini untuk animasi

// Simulasi Hash
function generateFakeHash() {
    const chars = 'abcdef0123456789';
    let hash = '';
    for (let i = 0; i < 64; i++) { hash += chars[Math.floor(Math.random() * chars.length)]; }
    return hash.substring(0, 16) + '...';
}

// Ubah Status Sensor
function ubahStatus(level) {
    const config = statusConfig[level];
    
    document.getElementById('status-banner').className = 'status-header ' + config.class;
    document.getElementById('status-text').innerText = level;
    document.getElementById('status-desc').innerText = config.desc;

    // Perbarui target untuk grafik yang bergerak
    currentTargetTemp = config.t;
    currentTargetHum = config.h;

    document.getElementById('val-suhu').innerText = config.t;
    document.getElementById('val-lembab').innerText = config.h;
    document.getElementById('val-asap').innerText = config.s;
    document.getElementById('val-api').innerText = config.uv;

    const logBody = document.getElementById('log-body');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + 
                    now.getMinutes().toString().padStart(2, '0') + ":" + 
                    now.getSeconds().toString().padStart(2, '0');
    
    const newRow = `<tr><td>${timeStr}</td><td>${level}</td><td class="hash-text">${generateFakeHash()}</td></tr>`;
    logBody.insertAdjacentHTML('afterbegin', newRow);

    if (level === 'AWAS') {
        alert("PERINGATAN FORENSIK: Indikasi api tingkat AWAS tercapai. Penguncian Chain of Custody diaktifkan!");
    }
}

// Inisialisasi Grafik Bergerak (Real-Time Scrolling)
document.addEventListener("DOMContentLoaded", function() {
    const ctx = document.getElementById('fireChart').getContext('2d');
    
    // Buat data riwayat awal (10 titik ke belakang)
    let initialLabels = [];
    let initialTemp = [];
    let initialHum = [];
    
    let now = new Date();
    for(let i = 12; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - i * 2000);
        let timeString = pastTime.getHours().toString().padStart(2, '0') + ":" + 
                         pastTime.getMinutes().toString().padStart(2, '0') + ":" + 
                         pastTime.getSeconds().toString().padStart(2, '0');
        initialLabels.push(timeString);
        initialTemp.push(27 + (Math.random() * 1.5 - 0.75));
        initialHum.push(82 + (Math.random() * 2 - 1));
    }

    fireChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [
                { 
                    label: 'Suhu (°C)', 
                    data: initialTemp, 
                    borderColor: '#ef5350', 
                    backgroundColor: 'rgba(239, 83, 80, 0.15)', // Efek bayangan (fill) merah transparan
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4, // Membuat garis melengkung estetik (tidak kaku)
                    pointRadius: 2,
                    pointBackgroundColor: '#ef5350'
                },
                { 
                    label: 'Kelembapan (%)', 
                    data: initialHum, 
                    borderColor: '#42a5f5', 
                    backgroundColor: 'rgba(66, 165, 245, 0.15)', // Efek bayangan (fill) biru transparan
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointBackgroundColor: '#42a5f5'
                }
            ]
        },
        options: {
            responsive: true,
            animation: {
                duration: 600, // Durasi animasi transisi halus
                easing: 'linear'
            },
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { ticks: { color: '#9e9e9e', maxTicksLimit: 7 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { 
                    ticks: { color: '#9e9e9e' }, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    suggestedMin: 20,
                    suggestedMax: 100
                }
            }
        }
    });
    
    ubahStatus('NORMAL');

    // Loop Interval: Menyuntikkan Data Baru Setiap 2 Detik
    setInterval(() => {
        const currentTime = new Date();
        const timeStr = currentTime.getHours().toString().padStart(2, '0') + ":" + 
                        currentTime.getMinutes().toString().padStart(2, '0') + ":" + 
                        currentTime.getSeconds().toString().padStart(2, '0');

        // Tambahkan fluktuasi acak (noise) agar data tidak terlalu datar/terlihat seperti sensor asli
        let newTemp = currentTargetTemp + (Math.random() * 1.5 - 0.75);
        let newHum = currentTargetHum + (Math.random() * 2 - 1);

        // Masukkan data baru ke paling kanan
        fireChart.data.labels.push(timeStr);
        fireChart.data.datasets[0].data.push(newTemp);
        fireChart.data.datasets[1].data.push(newHum);

        // Hapus data paling kiri agar grafik tidak menumpuk dan terlihat "berjalan"
        if (fireChart.data.labels.length > 15) {
            fireChart.data.labels.shift();
            fireChart.data.datasets[0].data.shift();
            fireChart.data.datasets[1].data.shift();
        }

        fireChart.update(); 
    }, 2000); // 2000 ms = grafik bergerak tiap 2 detik
});

// --- FUNGSI PINDAH TAB MENU ---
function bukaTab(namaTab, elemenMenu) {
    const semuaTab = document.querySelectorAll('.tab-content');
    semuaTab.forEach(tab => { tab.classList.remove('active'); });

    const semuaMenu = document.querySelectorAll('.nav-item');
    semuaMenu.forEach(menu => { menu.classList.remove('active'); });

    document.getElementById(namaTab).classList.add('active');
    elemenMenu.classList.add('active');
}
