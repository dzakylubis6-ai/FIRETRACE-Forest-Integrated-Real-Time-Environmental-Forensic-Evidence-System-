// Konfigurasi Deskripsi Status (Skala Regional Kalimantan)
const statusConfig = {
    "NORMAL": { class: "normal", desc: "Pemantauan regional rutin. Distribusi sensor di seluruh titik pantau Kalimantan menunjukkan data baseline normal.", t: 27, h: 82, s: 400, uv: 0, color: "#4caf50" },
    "WASPADA": { class: "waspada", desc: "Peningkatan frekuensi sampling di sektor tertentu. Tren anomali awal terdeteksi.", t: 29, h: 70, s: 850, uv: 0, color: "#f9a825" },
    "SIAGA": { class: "siaga", desc: "Sinyal peringatan dikirim. Drone verifikasi siaga untuk memantau area anomali di Kalimantan.", t: 31, h: 60, s: 1500, uv: 50, color: "#ef6c00" },
    "BAHAYA": { class: "bahaya", desc: "Perekaman krisis dimulai. Otoritas penanggulangan bencana daerah disiagakan.", t: 33, h: 50, s: 3500, uv: 150, color: "#c62828" },
    "AWAS": { class: "awas", desc: "Penguncian hash aktif. Draf Laporan Forensik Regional disusun secara real-time.", t: 35, h: 45, s: 6000, uv: 250, color: "#b71c1c" }
};

let fireChart; 
let currentTargetTemp = 27; 
let currentTargetHum = 82;  
let petaKalimantan;
let anomalyMarker;

// Simulasi Hash
function generateFakeHash() {
    const chars = 'abcdef0123456789';
    let hash = '';
    for (let i = 0; i < 64; i++) { hash += chars[Math.floor(Math.random() * chars.length)]; }
    return hash.substring(0, 16) + '...';
}

// Inisialisasi Saat Halaman Dimuat
document.addEventListener("DOMContentLoaded", function() {
    initMap();
    initChart();
    ubahStatus('NORMAL');
});

// 1. INISIALISASI PETA KALIMANTAN (Leaflet.js)
function initMap() {
    // Kordinat tengah Pulau Kalimantan
    petaKalimantan = L.map('kalimantan-map').setView([-0.5, 114.5], 5);
    
    // Basemap bernuansa gelap agar cocok dengan dashboard
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors & CARTO',
        maxZoom: 18
    }).addTo(petaKalimantan);

    // Titik Sensor Lain (Status selalu Hijau/Normal)
    const normalNodes = [
        { name: "Sektor Pantau Kalimantan Timur", coords: [0.5, 116.4] },
        { name: "Sektor Pantau Kalimantan Barat", coords: [-0.1, 111.0] },
        { name: "Sektor Pantau Kalimantan Selatan", coords: [-3.2, 115.2] },
        { name: "Sektor Pantau Kalimantan Utara", coords: [3.0, 116.0] }
    ];

    normalNodes.forEach(node => {
        L.circleMarker(node.coords, {
            radius: 6,
            fillColor: "#4caf50",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(petaKalimantan).bindPopup(`<b>${node.name}</b><br>Status: NORMAL`);
    });

    // Titik Sensor Utama (Yang akan berubah warna saat status diubah)
    anomalyMarker = L.circleMarker([-2.3, 113.9], {
        radius: 10,
        fillColor: "#4caf50",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
    }).addTo(petaKalimantan).bindPopup(`<b>Titik Pantau Hutan Kalimantan</b><br>Status: Menyesuaikan...`);
}

// 2. INISIALISASI GRAFIK BERJALAN (Chart.js)
function initChart() {
    const ctx = document.getElementById('fireChart').getContext('2d');
    let initialLabels = [];
    let initialTemp = [];
    let initialHum = [];
    
    let now = new Date();
    for(let i = 12; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - i * 2000);
        let timeString = pastTime.getHours().toString().padStart(2, '0') + ":" + pastTime.getMinutes().toString().padStart(2, '0') + ":" + pastTime.getSeconds().toString().padStart(2, '0');
        initialLabels.push(timeString);
        initialTemp.push(27 + (Math.random() * 1.5 - 0.75));
        initialHum.push(82 + (Math.random() * 2 - 1));
    }

    fireChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [
                { label: 'Suhu (°C)', data: initialTemp, borderColor: '#ef5350', backgroundColor: 'rgba(239, 83, 80, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2, pointBackgroundColor: '#ef5350' },
                { label: 'Kelembapan (%)', data: initialHum, borderColor: '#42a5f5', backgroundColor: 'rgba(66, 165, 245, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2, pointBackgroundColor: '#42a5f5' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: 'linear' },
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { ticks: { color: '#9e9e9e', maxTicksLimit: 7 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#9e9e9e' }, grid: { color: 'rgba(255,255,255,0.05)' }, suggestedMin: 20, suggestedMax: 100 }
            }
        }
    });

    // Interval Animasi Berjalan (Setiap 2 detik)
    setInterval(() => {
        const currentTime = new Date();
        const timeStr = currentTime.getHours().toString().padStart(2, '0') + ":" + currentTime.getMinutes().toString().padStart(2, '0') + ":" + currentTime.getSeconds().toString().padStart(2, '0');

        let newTemp = currentTargetTemp + (Math.random() * 1.5 - 0.75);
        let newHum = currentTargetHum + (Math.random() * 2 - 1);

        fireChart.data.labels.push(timeStr);
        fireChart.data.datasets[0].data.push(newTemp);
        fireChart.data.datasets[1].data.push(newHum);

        if (fireChart.data.labels.length > 15) {
            fireChart.data.labels.shift();
            fireChart.data.datasets[0].data.shift();
            fireChart.data.datasets[1].data.shift();
        }
        fireChart.update(); 
    }, 2000); 
}

// 3. FUNGSI UBAH STATUS (Berpengaruh ke Peta, Grafik, dan Tabel)
function ubahStatus(level) {
    const config = statusConfig[level];
    
    document.getElementById('status-banner').className = 'status-header ' + config.class;
    document.getElementById('status-text').innerText = level;
    document.getElementById('status-desc').innerText = config.desc;

    currentTargetTemp = config.t;
    currentTargetHum = config.h;

    document.getElementById('val-suhu').innerText = config.t;
    document.getElementById('val-lembab').innerText = config.h;
    document.getElementById('val-asap').innerText = config.s;
    document.getElementById('val-api').innerText = config.uv;

    // Ubah Warna Titik Peta Kalimantan (Node Fokus)
    if(anomalyMarker) {
        anomalyMarker.setStyle({ fillColor: config.color });
    }

    const logBody = document.getElementById('log-body');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0') + ":" + now.getSeconds().toString().padStart(2, '0');
    
    const newRow = `<tr><td>${timeStr}</td><td>${level}</td><td class="hash-text">${generateFakeHash()}</td></tr>`;
    logBody.insertAdjacentHTML('afterbegin', newRow);

    if (level === 'AWAS') {
        alert("PERINGATAN REGIONAL: Indikasi api tingkat AWAS di wilayah Kalimantan. Penguncian Chain of Custody diaktifkan!");
    }
}

// --- FUNGSI PINDAH TAB MENU ---
function bukaTab(namaTab, elemenMenu) {
    const semuaTab = document.querySelectorAll('.tab-content');
    semuaTab.forEach(tab => { tab.classList.remove('active'); });

    const semuaMenu = document.querySelectorAll('.nav-item');
    semuaMenu.forEach(menu => { menu.classList.remove('active'); });

    document.getElementById(namaTab).classList.add('active');
    elemenMenu.classList.add('active');
    
    // Perbaikan Bug Peta Leaflet saat pindah tab (memaksa render ulang ukuran)
    if(namaTab === 'monitoring' && petaKalimantan) {
        setTimeout(() => {
            petaKalimantan.invalidateSize();
        }, 100);
    }
}
