// Konfigurasi Deskripsi Status 
const statusConfig = {
    "NORMAL": { class: "normal", desc: "Pemantauan regional rutin. Data cuaca ditarik langsung secara real-time dari satelit wilayah Kalimantan.", s: 400, uv: 0, color: "#4caf50" },
    "WASPADA": { class: "waspada", desc: "Peningkatan frekuensi sampling di sektor tertentu. Tren anomali awal terdeteksi.", s: 850, uv: 0, color: "#f9a825" },
    "SIAGA": { class: "siaga", desc: "Sinyal peringatan dikirim. Drone verifikasi siaga untuk memantau area anomali.", s: 1500, uv: 50, color: "#ef6c00" },
    "BAHAYA": { class: "bahaya", desc: "Perekaman krisis dimulai. Otoritas penanggulangan bencana daerah disiagakan.", s: 3500, uv: 150, color: "#c62828" },
    "AWAS": { class: "awas", desc: "Penguncian hash aktif. Draf Laporan Forensik Regional disusun secara real-time.", s: 6000, uv: 250, color: "#b71c1c" }
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
    fetchRealTimeWeather(); // Ambil data cuaca asli dari API
    
    // Perbarui data cuaca asli setiap 5 menit otomatis
    setInterval(fetchRealTimeWeather, 300000); 
});

// FUNGSI MENARIK DATA CUACA NYATA DARI API (Open-Meteo)
async function fetchRealTimeWeather() {
    try {
        // Koordinat tengah hutan Kalimantan (Contoh: wilayah Kalimantan Tengah)
        const lat = -2.3;
        const lon = 113.9;
        
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
        const data = await response.json();
        
        if(data && data.current) {
            currentTargetTemp = Math.round(data.current.temperature_2m);
            currentTargetHum = Math.round(data.current.relative_humidity_2m);
            
            // Perbarui tampilan angka di kartu sensor
            document.getElementById('val-suhu').innerText = currentTargetTemp;
            document.getElementById('val-lembab').innerText = currentTargetHum;
        }
    } catch (error) {
        console.log("Gagal mengambil data cuaca real-time, menggunakan data lokal.", error);
    }
}

// 1. INISIALISASI PETA KALIMANTAN (Google Maps Satellite)
function initMap() {
    petaKalimantan = L.map('kalimantan-map').setView([-0.5, 114.5], 5);
    
    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: '&copy; Google Maps'
    }).addTo(petaKalimantan);

    const normalNodes = [
        { name: "Sektor Pantau Kalimantan Timur", coords: [0.5, 116.4] },
        { name: "Sektor Pantau Kalimantan Barat", coords: [-0.1, 111.0] },
        { name: "Sektor Pantau Kalimantan Selatan", coords: [-3.2, 115.2] },
        { name: "Sektor Pantau Kalimantan Utara", coords: [3.0, 116.0] }
    ];

    normalNodes.forEach(node => {
        L.circleMarker(node.coords, {
            radius: 6, fillColor: "#4caf50", color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.8
        }).addTo(petaKalimantan).bindPopup(`<b>${node.name}</b><br>Status: NORMAL`);
    });

    anomalyMarker = L.circleMarker([-2.3, 113.9], {
        radius: 10, fillColor: "#4caf50", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9
    }).addTo(petaKalimantan).bindPopup(`<b>Titik Pantau Hutan Kalimantan</b><br>Status: Menyesuaikan...`);
}

// 2. INISIALISASI GRAFIK BERJALAN (Chart.js)
function initChart() {
    const ctx = document.getElementById('fireChart').getContext('2d');
    let initialLabels = [], initialTemp = [], initialHum = [];
    
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
                { label: 'Suhu Asli (°C)', data: initialTemp, borderColor: '#ef5350', backgroundColor: 'rgba(239, 83, 80, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 },
                { label: 'Kelembapan Asli (%)', data: initialHum, borderColor: '#42a5f5', backgroundColor: 'rgba(66, 165, 245, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 600, easing: 'linear' },
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { ticks: { color: '#9e9e9e', maxTicksLimit: 7 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#9e9e9e' }, grid: { color: 'rgba(255,255,255,0.05)' }, suggestedMin: 20, suggestedMax: 100 }
            }
        }
    });

    // Interval Animasi Grafik Berjalan Berdasarkan Data API
    setInterval(() => {
        const currentTime = new Date();
        const timeStr = currentTime.getHours().toString().padStart(2, '0') + ":" + currentTime.getMinutes().toString().padStart(2, '0') + ":" + currentTime.getSeconds().toString().padStart(2, '0');

        let newTemp = currentTargetTemp + (Math.random() * 0.6 - 0.3); // Fluktuasi kecil dari suhu asli
        let newHum = currentTargetHum + (Math.random() * 1 - 0.5);

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

// 3. FUNGSI UBAH STATUS
function ubahStatus(level) {
    const config = statusConfig[level];
    
    document.getElementById('status-banner').className = 'status-header ' + config.class;
    document.getElementById('status-text').innerText = level;
    document.getElementById('status-desc').innerText = config.desc;

    // Jika level dinaikkan ke BAHAYA / AWAS, kita simulasikan lonjakan suhu di atas suhu asli cuaca
    if(level === 'BAHAYA') currentTargetTemp += 6;
    if(level === 'AWAS') currentTargetTemp += 10;

    document.getElementById('val-suhu').innerText = currentTargetTemp;
    document.getElementById('val-lembab').innerText = currentTargetHum;
    document.getElementById('val-asap').innerText = config.s;
    document.getElementById('val-api').innerText = config.uv;

    if(anomalyMarker) {
        anomalyMarker.setStyle({ fillColor: config.color });
        anomalyMarker.setPopupContent(`<b>Titik Pantau Hutan Kalimantan</b><br>Status: <strong>${level}</strong>`);
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
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(menu => menu.classList.remove('active'));
    document.getElementById(namaTab).classList.add('active');
    elemenMenu.classList.add('active');
    
    if(namaTab === 'monitoring' && petaKalimantan) {
        setTimeout(() => petaKalimantan.invalidateSize(), 100);
    }
}
