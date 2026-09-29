const statusRules = {
    NORMAL: { class: "normal", color: "#4caf50", desc: "Kondisi stabil. Risiko kebakaran rendah." },
    WASPADA: { class: "waspada", color: "#f9a825", desc: "Suhu mulai meningkat. Pemantauan diperketat." },
    SIAGA: { class: "siaga", color: "#ef6c00", desc: "Kelembapan rendah. Potensi titik panas terdeteksi." },
    BAHAYA: { class: "bahaya", color: "#c62828", desc: "Kondisi Kritis! Suhu ekstrem dan udara sangat kering." }
};

let fireChart;
let petaKalimantan;
let regionalMarkers = {};

// Variabel Kontrol
let activeRegionId = "all"; // "all" berarti rata-rata seluruh Kalimantan
let prevTemp = 28.0; 
let prevHum = 75.0;

// Data Base Wilayah
const kalimantanRegions = [
    { id: "kalteng", name: "Kalimantan Tengah", short: "KALTENG", lat: -2.3, lon: 113.9, baseTemp: 28, baseHum: 78 },
    { id: "kaltim", name: "Kalimantan Timur", short: "KALTIM", lat: 0.5, lon: 116.4, baseTemp: 28, baseHum: 78 },
    { id: "kalbar", name: "Kalimantan Barat", short: "KALBAR", lat: -0.1, lon: 111.0, baseTemp: 28, baseHum: 78 },
    { id: "kalsel", name: "Kalimantan Selatan", short: "KALSEL", lat: -3.2, lon: 115.2, baseTemp: 28, baseHum: 78 },
    { id: "kaltara", name: "Kalimantan Utara", short: "KALTARA", lat: 3.0, lon: 116.0, baseTemp: 28, baseHum: 78 }
];

function generateFakeHash() {
    const chars = 'abcdef0123456789';
    let hash = '';
    for(let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
    return hash.substring(0, 16) + '...';
}

document.addEventListener("DOMContentLoaded", function() {
    initMap();
    initChart();
    fetchWeatherAllRegions();
    
    setInterval(fetchWeatherAllRegions, 60000); 
    // MENGHITUNG SETIAP 1 DETIK
    setInterval(perSecondUpdate, 1000);
});

function initMap() {
    petaKalimantan = L.map('kalimantan-map').setView([-0.5, 114.5], 5);
    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3']
    }).addTo(petaKalimantan);

    kalimantanRegions.forEach(reg => {
        let marker = L.circleMarker([reg.lat, reg.lon], {
            radius: 8, fillColor: "#4caf50", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9
        }).addTo(petaKalimantan);

        // Tooltip sederhana
        marker.bindTooltip(`<b>${reg.name}</b><br>Klik untuk fokus ke area ini`, {permanent: false, direction: "top"});
        
        // INTERAKTIF KLIK TITIK PETA
        marker.on('click', function() {
            ubahFokusWilayah(reg.id);
            // Perbarui pop-up saat diklik dengan data terakhir
            this.bindPopup(`<b>${reg.name}</b><br>Suhu: ${reg.baseTemp.toFixed(2)}°C<br>Lembap: ${reg.baseHum.toFixed(2)}%`).openPopup();
        });
        regionalMarkers[reg.id] = marker;
    });
}

// 1. FUNGSI KLIK PROVINSI TERTENTU
function ubahFokusWilayah(id) {
    activeRegionId = id;
    const reg = kalimantanRegions.find(r => r.id === id);
    
    // Pastikan ID ini sama persis dengan yang ada di HTML
    document.getElementById('sidebar-wilayah').innerText = reg.name;
    document.getElementById('nama-wilayah-status').innerText = reg.short;
    document.getElementById('nama-wilayah-suhu').innerText = reg.name; // Berubah menjadi misal "Kalimantan Selatan"
    document.getElementById('nama-wilayah-lembab').innerText = reg.name; // Berubah menjadi misal "Kalimantan Selatan"
    document.getElementById('grafik-wilayah').innerText = reg.name;
    document.getElementById('profile-nama-wilayah').innerText = reg.name;
    
    document.getElementById('bap-reg-wilayah').innerText = reg.short;
    document.getElementById('bap-lokasi').innerText = `${reg.name} (Fokus Titik)`;

    resetGrafik();
    // Hilangkan alert agar tidak mengganggu, atau biarkan jika diinginkan
    // alert(`MENGALIHKAN FOKUS: Dashboard dan Laporan Forensik kini mengunci data real-time untuk ${reg.name}.`);
}

// 2. FUNGSI KEMBALI KE SELURUH KALIMANTAN (TOMBOL BIRU)
function resetKeSemuaProvinsi() {
    activeRegionId = "all";
    document.getElementById('sidebar-wilayah').innerText = "Seluruh Kalimantan";
    document.getElementById('nama-wilayah-status').innerText = "SELURUH KALIMANTAN";
    document.getElementById('nama-wilayah-suhu').innerText = "Rata-rata Kalimantan";
    document.getElementById('nama-wilayah-lembab').innerText = "Rata-rata Kalimantan";
    document.getElementById('grafik-wilayah').innerText = "Seluruh Kalimantan";
    document.getElementById('profile-nama-wilayah').innerText = "Seluruh Kalimantan";

    document.getElementById('bap-reg-wilayah').innerText = "ALL";
    document.getElementById('bap-lokasi').innerText = "Seluruh Kalimantan (Agregat 5 Provinsi)";

    resetGrafik();
}

function resetGrafik() {
    fireChart.data.labels = [];
    fireChart.data.datasets[0].data = [];
    fireChart.data.datasets[1].data = [];
    fireChart.update();
}

async function fetchWeatherAllRegions() {
    for (let reg of kalimantanRegions) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m,relative_humidity_2m`);
            const data = await response.json();
            if(data && data.current) {
                reg.baseTemp = data.current.temperature_2m;
                reg.baseHum = data.current.relative_humidity_2m;
                
                let statusKey = "NORMAL";
                if (reg.baseTemp >= 31 && reg.baseHum < 70) statusKey = "WASPADA";
                if (reg.baseTemp >= 33 && reg.baseHum < 55) statusKey = "SIAGA";
                if (reg.baseTemp >= 35 || reg.baseHum < 45) statusKey = "BAHAYA";
                
                if(regionalMarkers[reg.id]) regionalMarkers[reg.id].setStyle({ fillColor: statusRules[statusKey].color });
            }
        } catch (e) { console.log(`Error API ${reg.name}`, e); }
    }
}

function initChart() {
    const ctx = document.getElementById('fireChart').getContext('2d');
    fireChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Suhu Aktual (°C)', data: [], borderColor: '#ef5350', backgroundColor: 'rgba(239, 83, 80, 0.15)', borderWidth: 2, fill: true, tension: 0.4 },
                { label: 'Kelembapan Aktual (%)', data: [], borderColor: '#42a5f5', backgroundColor: 'rgba(66, 165, 245, 0.15)', borderWidth: 2, fill: true, tension: 0.4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
            scales: {
                x: { ticks: { color: '#9e9e9e' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#9e9e9e' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// 3. MESIN UTAMA: PERHITUNGAN PER DETIK & PERGANTIAN SUHU (DELTA)
function perSecondUpdate() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID'); 
    const currentSecond = now.getSeconds();
    const liveHash = generateFakeHash();

    let liveTemp = 0, liveHum = 0, targetName = "";

    // Tentukan apakah baca data Rata-rata atau Provinsi spesifik
    if (activeRegionId === "all") {
        targetName = "Seluruh wilayah Kalimantan (Agregat 5 Provinsi)";
        let totalTemp = 0, totalHum = 0;
        kalimantanRegions.forEach(r => { totalTemp += r.baseTemp; totalHum += r.baseHum; });
        liveTemp = totalTemp / kalimantanRegions.length;
        liveHum = totalHum / kalimantanRegions.length;
    } else {
        const activeReg = kalimantanRegions.find(r => r.id === activeRegionId);
        targetName = `Wilayah ${activeReg.name}`;
        liveTemp = activeReg.baseTemp;
        liveHum = activeReg.baseHum;
    }

    // Tambah fluktuasi mikro per detik
    liveTemp += (Math.random() * 0.4 - 0.2);
    liveHum += (Math.random() * 0.6 - 0.3);

    // HITUNG PERGANTIAN/SELISIH PER DETIK (DELTA)
    let deltaTemp = liveTemp - prevTemp;
    let deltaHum = liveHum - prevHum;
    prevTemp = liveTemp;
    prevHum = liveHum;

    let currentStatus = "NORMAL";
    if (liveTemp >= 31 && liveHum < 70) currentStatus = "WASPADA";
    if (liveTemp >= 33 && liveHum < 55) currentStatus = "SIAGA";
    if (liveTemp >= 35 || liveHum < 45) currentStatus = "BAHAYA";
    let cfg = statusRules[currentStatus];

    // --- PERBARUI UI DASBOARD ---
    document.getElementById('val-suhu').innerText = liveTemp.toFixed(2);
    document.getElementById('val-lembab').innerText = liveHum.toFixed(2);
    
    // Tampilkan selisih pergantian per detik (Warna merah jika naik, hijau jika turun)
    let deltaSuhuEl = document.getElementById('delta-suhu');
    deltaSuhuEl.innerText = (deltaTemp > 0 ? "+" : "") + deltaTemp.toFixed(2) + " °C/dtk";
    deltaSuhuEl.style.color = deltaTemp > 0 ? "#ff5252" : "#69f0ae";

    let deltaLembabEl = document.getElementById('delta-lembab');
    deltaLembabEl.innerText = (deltaHum > 0 ? "+" : "") + deltaHum.toFixed(2) + " %/dtk";
    deltaLembabEl.style.color = deltaHum > 0 ? "#64b5f6" : "#ffb74d";

    document.getElementById('status-text').innerText = currentStatus;
    document.getElementById('status-desc').innerText = `Pemantauan ${targetName}. ${cfg.desc}`;
    document.getElementById('status-banner').className = 'status-header ' + currentStatus.toLowerCase();

    document.getElementById('val-asap').innerText = currentStatus === 'BAHAYA' ? '5200' : (currentStatus === 'SIAGA' ? '2100' : '400');
    document.getElementById('val-risiko').innerText = currentStatus === 'BAHAYA' ? '92% (Kritis)' : (currentStatus === 'SIAGA' ? '75% (Tinggi)' : (currentStatus === 'WASPADA' ? '45% (Sedang)' : '15% (Rendah)'));
    document.getElementById('val-prediksi-singkat').innerText = currentStatus === 'BAHAYA' ? 'Eskalasi Cepat' : 'Stabil';
    document.getElementById('profile-tingkat-ancaman').innerText = currentStatus === 'BAHAYA' ? 'KRITIS' : 'RENDAH';
    
    document.getElementById('live-indicator').innerText = `● LIVE PER-SECOND (${timeStr})`;
    document.getElementById('live-indicator').style.color = currentSecond % 2 === 0 ? "#4caf50" : "#fff";

    // --- PERBARUI GRAFIK ---
    fireChart.data.labels.push(timeStr);
    fireChart.data.datasets[0].data.push(liveTemp);
    fireChart.data.datasets[1].data.push(liveHum);
    if(fireChart.data.labels.length > 15) {
        fireChart.data.labels.shift(); fireChart.data.datasets[0].data.shift(); fireChart.data.datasets[1].data.shift();
    }
    fireChart.update();

    // --- PERBARUI LAPORAN FORENSIK PER DETIK (DENGAN PENJELASAN DELTA) ---
    document.getElementById('bap-detik').innerText = currentSecond.toString().padStart(2, '0');
    document.getElementById('bap-waktu').innerText = `${now.toLocaleString('id-ID')} WIB (Sinkronisasi Detik Aktif)`;
    document.getElementById('bap-hash').innerText = liveHash;

    let bapRingkasan = `Sistem mencatat pembacaan real-time pada ${timeStr} WIB difokuskan pada ${targetName}. Suhu absolut saat ini adalah ${liveTemp.toFixed(2)}°C dengan kelembapan ${liveHum.toFixed(2)}%. 
    Analisis mikro-fluktuasi menunjukkan pergantian suhu sebesar ${deltaTemp > 0 ? '+' : ''}${deltaTemp.toFixed(2)} °C/detik dan perubahan kelembapan sebesar ${deltaHum > 0 ? '+' : ''}${deltaHum.toFixed(2)} %/detik.`;
    
    let bapPrediksi = `Berdasarkan dinamika per detik, AI menetapkan status area ini pada level ${currentStatus}. Lonjakan panas (Rate of Rise) per detik ${Math.abs(deltaTemp) > 0.15 ? 'terindikasi agresif' : 'terpantau wajar'}. Proyeksi 3 jam ke depan aman dari titik bakar sporadis jika angka pergantian suhu (delta) tidak melebihi +0.50 °C/detik.`;

    document.getElementById('bap-ringkasan').innerText = bapRingkasan;
    document.getElementById('bap-prediksi').innerText = bapPrediksi;
    document.getElementById('profile-prediksi-teks').innerText = `Fokus: ${targetName}. Pergantian Suhu: ${deltaTemp.toFixed(2)}°C/dtk. Pergantian Kelembapan: ${deltaHum.toFixed(2)}%/dtk.`;

    // --- LOG INTEGRITAS ---
    if (currentSecond % 3 === 0) {
        let labelWilayah = activeRegionId === "all" ? "ALL REGIONS" : kalimantanRegions.find(r => r.id === activeRegionId).short;
        let newLog = `<tr><td>${timeStr}</td><td>${labelWilayah} - LIVE</td><td class="hash-text">${liveHash}</td></tr>`;
        document.getElementById('log-body').insertAdjacentHTML('afterbegin', newLog);
        document.getElementById('log-body-audit').insertAdjacentHTML('afterbegin', newLog);
    }
}

function bukaTab(namaTab, elemenMenu) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(menu => menu.classList.remove('active'));
    document.getElementById(namaTab).classList.add('active');
    elemenMenu.classList.add('active');
    if(namaTab === 'monitoring' && petaKalimantan) setTimeout(() => petaKalimantan.invalidateSize(), 100);
}
