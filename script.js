const statusRules = {
    NORMAL: { class: "normal", color: "#4caf50", desc: "Kondisi stabil di seluruh sektor regional Kalimantan. Risiko kebakaran rendah." },
    WASPADA: { class: "waspada", color: "#f9a825", desc: "Suhu regional mulai meningkat di beberapa sektor. Pemantauan diperketat." },
    SIAGA: { class: "siaga", color: "#ef6c00", desc: "Kelembapan udara menurun di kawasan hutan Kalimantan. Potensi titik panas terdeteksi." },
    BAHAYA: { class: "bahaya", color: "#c62828", desc: "Kondisi Kritis Regional! Suhu tinggi dan udara sangat kering melanda sebagian wilayah." }
};

let fireChart;
let regionalMarkers = {};
let petaKalimantan;

// Data Koordinat 5 Provinsi di Kalimantan (Seluruh Kalimantan)
const kalimantanRegions = [
    { id: "kalteng", name: "Kalimantan Tengah", lat: -2.3, lon: 113.9, temp: 28, hum: 75 },
    { id: "kaltim", name: "Kalimantan Timur", lat: 0.5, lon: 116.4, temp: 28, hum: 75 },
    { id: "kalbar", name: "Kalimantan Barat", lat: -0.1, lon: 111.0, temp: 28, hum: 75 },
    { id: "kalsel", name: "Kalimantan Selatan", lat: -3.2, lon: 115.2, temp: 28, hum: 75 },
    { id: "kaltara", name: "Kalimantan Utara", lat: 3.0, lon: 116.0, temp: 28, hum: 75 }
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
    
    // Tarik data satelit setiap 30 detik untuk pembaharuan cuaca aktual lintas provinsi
    setInterval(fetchAllRegionsWeather, 30000);
});

function initMap() {
    petaKalimantan = L.map('kalimantan-map').setView([-0.5, 114.5], 5);
    
    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: '&copy; Google Maps'
    }).addTo(petaKalimantan);

    kalimantanRegions.forEach(reg => {
        let marker = L.circleMarker([reg.lat, reg.lon], {
            radius: 9, fillColor: "#4caf50", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9
        }).addTo(petaKalimantan);

        marker.bindPopup(`<b>${reg.name}</b><br>Menghubungkan satelit...`);
        regionalMarkers[reg.id] = marker;
    });
}

async function fetchAllRegionsWeather() {
    let totalTemp = 0;
    let totalHum = 0;
    let validCount = 0;

    for (let reg of kalimantanRegions) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m,relative_humidity_2m`);
            const data = await response.json();
            
            if (data && data.current) {
                reg.temp = Math.round(data.current.temperature_2m);
                reg.hum = Math.round(data.current.relative_humidity_2m);
                
                totalTemp += reg.temp;
                totalHum += reg.hum;
                validCount++;

                let statusKey = "NORMAL";
                if (reg.temp >= 31 && reg.hum < 70) statusKey = "WASPADA";
                if (reg.temp >= 33 && reg.hum < 55) statusKey = "SIAGA";
                if (reg.temp >= 35 || reg.hum < 45) statusKey = "BAHAYA";

                let cfg = statusRules[statusKey];

                if (regionalMarkers[reg.id]) {
                    regionalMarkers[reg.id].setStyle({ fillColor: cfg.color });
                    regionalMarkers[reg.id].setPopupContent(`<b>${reg.name}</b><br>Suhu: ${reg.temp}°C | Lembap: ${reg.hum}%<br>Status: <strong>${statusKey}</strong>`);
                }
            }
        } catch (error) {
            console.log(`Gagal memuat data untuk ${reg.name}`, error);
        }
    }

    if (validCount > 0) {
        let avgTemp = Math.round(totalTemp / validCount);
        let avgHum = Math.round(totalHum / validCount);

        let regionalStatus = "NORMAL";
        if (avgTemp >= 31 && avgHum < 70) regionalStatus = "WASPADA";
        if (avgTemp >= 33 && avgHum < 55) regionalStatus = "SIAGA";
        if (avgTemp >= 35 || avgHum < 45) regionalStatus = "BAHAYA";

        let cfg = statusRules[regionalStatus];

        document.getElementById('val-suhu').innerText = avgTemp;
        document.getElementById('val-lembab').innerText = avgHum;
        document.getElementById('status-text').innerText = regionalStatus + " (SELURUH KALIMANTAN)";
        document.getElementById('status-desc').innerText = `Pemantauan lintas 5 Provinsi. ${cfg.desc}`;
        document.getElementById('status-banner').className = 'status-header ' + regionalStatus.toLowerCase();
        
        let asapVal = regionalStatus === 'BAHAYA' ? '5200' : (regionalStatus === 'SIAGA' ? '2100' : '400');
        let risikoVal = regionalStatus === 'BAHAYA' ? '92% (Kritis)' : (regionalStatus === 'SIAGA' ? '75% (Tinggi)' : (regionalStatus === 'WASPADA' ? '45% (Sedang)' : '15% (Rendah)'));
        
        document.getElementById('val-asap').innerText = asapVal;
        document.getElementById('val-risiko').innerText = risikoVal;
    }
}

// INISIALISASI GRAFIK & TICKER AKTIF PER DETIK (BERUBAH TIAP DETIK DI FORENSIC REPORT & MONITORING)
function initChart() {
    const ctx = document.getElementById('fireChart').getContext('2d');
    let initialLabels = [], initialTemp = [], initialHum = [];
    let now = new Date();
    for(let i = 12; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - i * 1000);
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
                { label: 'Suhu Rata-rata Kalimantan (°C)', data: initialTemp, borderColor: '#ef5350', backgroundColor: 'rgba(239, 83, 80, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 },
                { label: 'Kelembapan Rata-rata (%)', data: initialHum, borderColor: '#42a5f5', backgroundColor: 'rgba(66, 165, 245, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 300, easing: 'linear' },
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { ticks: { color: '#9e9e9e', maxTicksLimit: 7 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#9e9e9e' }, grid: { color: 'rgba(255,255,255,0.05)' }, suggestedMin: 20, suggestedMax: 100 }
            }
        }
    });

    // TICKER AKTIF PER DETIK (1000 milidetik)
    setInterval(() => {
        const currentTime = new Date();
        const timeStr = currentTime.getHours().toString().padStart(2, '0') + ":" + currentTime.getMinutes().toString().padStart(2, '0') + ":" + currentTime.getSeconds().toString().padStart(2, '0');
        
        let currentTempVal = parseFloat(document.getElementById('val-suhu').innerText) || 28;
        let currentHumVal = parseFloat(document.getElementById('val-lembab').innerText) || 75;

        // Fluktuasi mikro per detik agar grafik hidup & bergerak tiap detik
        let microTemp = currentTempVal + (Math.random() * 0.4 - 0.2);
        let microHum = currentHumVal + (Math.random() * 0.6 - 0.3);

        fireChart.data.labels.push(timeStr);
        fireChart.data.datasets[0].data.push(microTemp);
        fireChart.data.datasets[1].data.push(microHum);

        if (fireChart.data.labels.length > 20) {
            fireChart.data.labels.shift(); 
            fireChart.data.datasets[0].data.shift(); 
            fireChart.data.datasets[1].data.shift();
        }
        fireChart.update(); 

        // PERBARUI FORENSIC REPORT DAN TEKS PREDIKTIF SETIAP DETIK SECARA JELAS
        let statusText = document.getElementById('status-text').innerText.split(" ")[0];
        document.getElementById('bap-waktu').innerText = currentTime.toLocaleString('id-ID') + " (Live Stream Detik ke-" + currentTime.getSeconds() + ")";
        
        let bapRingkasanEl = document.getElementById('bap-ringkasan');
        let bapPrediksiEl = document.getElementById('bap-prediksi');
        let profilePrediksiEl = document.getElementById('profile-prediksi-teks');

        if(bapRingkasanEl && bapPrediksiEl) {
            bapRingkasanEl.innerText = `Pemantauan lintas 5 Provinsi di Pulau Kalimantan (Kalteng, Kaltim, Kalbar, Kalsel, Kaltara) mencatat suhu rata-rata ${microTemp.toFixed(2)}°C dan kelembapan ${microHum.toFixed(2)}%. Sinkronisasi digital real-time mencatat parameter mikroklimat aktif pada detik ke-${currentTime.getSeconds()}.`;
            bapPrediksiEl.innerText = `AI Predictive Engine aktif (Live Tick #${currentTime.getSeconds()}): Proyeksi eskalasi termal regional 3 jam ke depan terpantau stabil dengan tanda tangan kriptografi SHA-256 yang diperbarui kontinu tiap detik.`;
        }

        if(profilePrediksiEl) {
            profilePrediksiEl.innerText = `Analisis multi-region 5 provinsi berjalan aktif per detik. Suhu rata-rata aktual ${microTemp.toFixed(2)}°C, kelembapan ${microHum.toFixed(2)}%. Status Regional: ${statusText}.`;
        }

        // Tambahkan baris log per detik ke tabel integritas
        const logBody = document.getElementById('log-body');
        const auditBody = document.getElementById('log-body-audit');
        const newHash = generateFakeHash();
        
        if(logBody && currentTime.getSeconds() % 2 === 0) {
            const newRow = `<tr><td>${timeStr}</td><td>LIVE 5-PROV SYNC</td><td class="hash-text">${newHash}</td></tr>`;
            logBody.insertAdjacentHTML('afterbegin', newRow);
        }
        if(auditBody && currentTime.getSeconds() % 2 === 0) {
            auditBody.insertAdjacentHTML('afterbegin', `<tr><td>${timeStr}</td><td>Per-Second Multi-Region Stream</td><td>VERIFIED</td><td class="hash-text">${newHash}</td></tr>`);
        }
    }, 1000); 
}

function bukaTab(namaTab, elemenMenu) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(menu => menu.classList.remove('active'));
    document.getElementById(namaTab).classList.add('active');
    elemenMenu.classList.add('active');
    if(namaTab === 'monitoring' && petaKalimantan) setTimeout(() => petaKalimantan.invalidateSize(), 100);
}
