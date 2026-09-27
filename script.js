// Konfigurasi Status Risiko Kebakaran Otomatis
const statusRules = {
    NORMAL: { class: "normal", color: "#4caf50", desc: "Kondisi stabil. Risiko kebakaran rendah." },
    WASPADA: { class: "waspada", color: "#f9a825", desc: "Suhu mulai meningkat. Pemantauan diperketat." },
    SIAGA: { class: "siaga", color: "#ef6c00", desc: "Kelembapan rendah. Potensi titik panas terdeteksi." },
    BAHAYA: { class: "bahaya", color: "#c62828", desc: "Kondisi Kritis! Suhu tinggi dan udara sangat kering." }
};

let fireChart;
let regionalMarkers = {};
let petaKalimantan;

// Data Koordinat 5 Provinsi di Kalimantan
const kalimantanRegions = [
    { id: "kalteng", name: "Kalimantan Tengah", lat: -2.3, lon: 113.9 },
    { id: "kaltim", name: "Kalimantan Timur", lat: 0.5, lon: 116.4 },
    { id: "kalbar", name: "Kalimantan Barat", lat: -0.1, lon: 111.0 },
    { id: "kalsel", name: "Kalimantan Selatan", lat: -3.2, lon: 115.2 },
    { id: "kaltara", name: "Kalimantan Utara", lat: 3.0, lon: 116.0 }
];

function generateFakeHash() {
    const chars = 'abcdef0123456789';
    let hash = '';
    for (let i = 0; i < 64; i++) { hash += chars[Math.floor(Math.random() * chars.length)]; }
    return hash.substring(0, 16) + '...';
}

document.addEventListener("DOMContentLoaded", function() {
    initMap();
    initChart();
    fetchAllRegionsWeather();
    
    // Perbarui data otomatis setiap 5 menit
    setInterval(fetchAllRegionsWeather, 300000);
});

// INISIALISASI PETA GOOGLE MAPS SATELLITE
function initMap() {
    petaKalimantan = L.map('kalimantan-map').setView([-0.5, 114.5], 5);
    
    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: '&copy; Google Maps'
    }).addTo(petaKalimantan);

    // Buat marker mandiri untuk masing-masing provinsi
    kalimantanRegions.forEach(reg => {
        let marker = L.circleMarker([reg.lat, reg.lon], {
            radius: 9,
            fillColor: "#4caf50",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(petaKalimantan);

        marker.bindPopup(`<b>${reg.name}</b><br>Menghubungkan satelit...`);
        regionalMarkers[reg.id] = marker;
    });
}

// MENARIK DATA CUACA NYATA SECARA MANDIRI UNTUK TIAP PROVINSI
async function fetchAllRegionsWeather() {
    for (let reg of kalimantanRegions) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m,relative_humidity_2m`);
            const data = await response.json();
            
            if (data && data.current) {
                let temp = Math.round(data.current.temperature_2m);
                let hum = Math.round(data.current.relative_humidity_2m);
                
                // Tentukan status secara mandiri berdasarkan suhu & kelembapan nyata
                let statusKey = "NORMAL";
                if (temp >= 31 && hum < 70) statusKey = "WASPADA";
                if (temp >= 33 && hum < 55) statusKey = "SIAGA";
                if (temp >= 35 || hum < 45) statusKey = "BAHAYA";

                let cfg = statusRules[statusKey];

                // Jika wilayah Kalimantan Tengah, tampilkan di kartu utama atas
                if (reg.id === "kalteng") {
                    document.getElementById('val-suhu').innerText = temp;
                    document.getElementById('val-lembab').innerText = hum;
                    document.getElementById('status-text').innerText = statusKey;
                    document.getElementById('status-desc').innerText = `Pemantauan mandiri wilayah ${reg.name}. ${cfg.desc}`;
                    document.getElementById('status-banner').className = 'status-header ' + statusKey.toLowerCase();
                    
                    document.getElementById('val-asap').innerText = statusKey === 'BAHAYA' ? '5200' : (statusKey === 'SIAGA' ? '2100' : '400');
                    document.getElementById('val-api').innerText = statusKey === 'BAHAYA' ? '120' : (statusKey === 'SIAGA' ? '30' : '0');
                }

                // Perbarui warna dan popup mandiri di peta untuk tiap provinsi
                if (regionalMarkers[reg.id]) {
                    regionalMarkers[reg.id].setStyle({ fillColor: cfg.color });
                    regionalMarkers[reg.id].setPopupContent(`<b>${reg.name}</b><br>Suhu Faktual: ${temp}°C<br>Kelembapan: ${hum}%<br>Status: <strong>${statusKey}</strong>`);
                }
            }
        } catch (error) {
            console.log(`Gagal memuat data untuk ${reg.name}`, error);
        }
    }
    
    // Tambahkan log integritas otomatis
    const logBody = document.getElementById('log-body');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0') + ":" + now.getSeconds().toString().padStart(2, '0');
    const newRow = `<tr><td>${timeStr}</td><td>AUTO-SYNC (LIVE)</td><td class="hash-text">${generateFakeHash()}</td></tr>`;
    if(logBody) logBody.insertAdjacentHTML('afterbegin', newRow);
}

// INISIALISASI GRAFIK BERJALAN
function initChart() {
    const ctx = document.getElementById('fireChart').getContext('2d');
    let initialLabels = [], initialTemp = [], initialHum = [];
    let now = new Date();
    for(let i = 12; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - i * 2000);
        let timeString = pastTime.getHours().toString().padStart(2, '0') + ":" + pastTime.getMinutes().toString().padStart(2, '0') + ":" + pastTime.getSeconds().toString().padStart(2, '0');
        initialLabels.push(timeString);
        initialTemp.push(28 + (Math.random() * 1 - 0.5));
        initialHum.push(75 + (Math.random() * 2 - 1));
    }

    fireChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [
                { label: 'Suhu Aktual (°C)', data: initialTemp, borderColor: '#ef5350', backgroundColor: 'rgba(239, 83, 80, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 },
                { label: 'Kelembapan Aktual (%)', data: initialHum, borderColor: '#42a5f5', backgroundColor: 'rgba(66, 165, 245, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 }
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

    setInterval(() => {
        const currentTime = new Date();
        const timeStr = currentTime.getHours().toString().padStart(2, '0') + ":" + currentTime.getMinutes().toString().padStart(2, '0') + ":" + currentTime.getSeconds().toString().padStart(2, '0');
        
        let currentTempVal = parseFloat(document.getElementById('val-suhu').innerText) || 28;
        let currentHumVal = parseFloat(document.getElementById('val-lembab').innerText) || 75;

        fireChart.data.labels.push(timeStr);
        fireChart.data.datasets[0].data.push(currentTempVal + (Math.random() * 0.4 - 0.2));
        fireChart.data.datasets[1].data.push(currentHumVal + (Math.random() * 0.8 - 0.4));

        if (fireChart.data.labels.length > 15) {
            fireChart.data.labels.shift(); 
            fireChart.data.datasets[0].data.shift(); 
            fireChart.data.datasets[1].data.shift();
        }
        fireChart.update(); 
    }, 2000); 
}

// Fungsi Tab Menu
function bukaTab(namaTab, elemenMenu) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(menu => menu.classList.remove('active'));
    document.getElementById(namaTab).classList.add('active');
    elemenMenu.classList.add('active');
    if(namaTab === 'monitoring' && petaKalimantan) setTimeout(() => petaKalimantan.invalidateSize(), 100);
}
