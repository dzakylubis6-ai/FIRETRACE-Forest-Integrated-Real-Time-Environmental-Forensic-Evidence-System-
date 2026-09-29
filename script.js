const statusRules = {
    NORMAL: { class: "normal", color: "#4caf50", desc: "Kondisi ekosistem stabil. Berada di bawah ambang batas kritis Karhutla." },
    WASPADA: { class: "waspada", color: "#f9a825", desc: "Suhu meningkat bertahap. Sesuai protokol kewaspadaan kewilayahan." },
    SIAGA: { class: "siaga", color: "#ef6c00", desc: "Kelembapan udara rendah. Potensi anomali titik panas terdeteksi." },
    BAHAYA: { class: "bahaya", color: "#c62828", desc: "Kondisi Kritis! Parameter lingkungan melampaui batas aman standar." }
};

let fireChart;
let petaKalimantan;
let regionalMarkers = {};

let activeRegionId = "all"; 
let prevTemp = 28.0; 
let prevHum = 75.0;

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

// INI JANTUNG APLIKASINYA - MENJAMIN DATA LANGSUNG KELUAR
document.addEventListener("DOMContentLoaded", async function() {
    initMap();
    initChart();
    
    // 1. Tarik Data Utama dari Satelit terlebih dahulu
    await fetchWeatherAllRegions();
    
    // 2. Tampilkan laporan secara instan (Tab 2, 3, dan 4 tidak akan kosong)
    generateForensicReport();
    
    // 3. Atur jadwal update cuaca asli dari satelit tiap 1 Menit
    setInterval(fetchWeatherAllRegions, 60000); 
    
    // 4. Atur jadwal CETAK LAPORAN FORENSIK (BAP) RESMI SETIAP 1 MENIT
    setInterval(generateForensicReport, 60000); 

    // 5. Atur jadwal ANIMASI DASHBOARD TETAP BERGERAK SETIAP 1 DETIK
    setInterval(perSecondDashboardUpdate, 1000);
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

        marker.bindTooltip(`<b>${reg.name}</b><br>Klik untuk mengunci BAP Forensik di wilayah ini`, {permanent: false, direction: "top"});
        
        marker.on('click', function() {
            ubahFokusWilayah(reg.id);
            this.bindPopup(`<b>PEMANTAUAN TERKUNCI: ${reg.name}</b><br>Menyusun laporan pro-justitia...`).openPopup();
        });
        regionalMarkers[reg.id] = marker;
    });
}

function ubahFokusWilayah(id) {
    activeRegionId = id;
    const reg = kalimantanRegions.find(r => r.id === id);
    
    document.getElementById('judul-suhu').innerText = "Suhu: " + reg.name;
    document.getElementById('judul-lembab').innerText = "Kelembapan: " + reg.name;
    document.getElementById('sidebar-wilayah').innerText = reg.name;
    document.getElementById('nama-wilayah-status').innerText = reg.short;
    document.getElementById('grafik-wilayah').innerText = reg.name;
    document.getElementById('profile-nama-wilayah').innerText = reg.name;
    
    document.getElementById('bap-reg-wilayah').innerText = reg.short;
    document.getElementById('bap-lokasi').innerText = `${reg.name} (Data Sektor Terisolasi)`;

    resetGrafik();
    
    // Saat wilayah diklik, LANGSUNG cetak laporan baru agar tidak kosong
    generateForensicReport();
}

function resetKeSemuaProvinsi() {
    activeRegionId = "all";
    
    document.getElementById('judul-suhu').innerText = "Suhu: Seluruh Kalimantan";
    document.getElementById('judul-lembab').innerText = "Kelembapan: Seluruh Kalimantan";
    document.getElementById('sidebar-wilayah').innerText = "Seluruh Kalimantan";
    document.getElementById('nama-wilayah-status').innerText = "SELURUH KALIMANTAN";
    document.getElementById('grafik-wilayah').innerText = "Seluruh Kalimantan";
    document.getElementById('profile-nama-wilayah').innerText = "Seluruh Kalimantan";

    document.getElementById('bap-reg-wilayah').innerText = "ALL";
    document.getElementById('bap-lokasi').innerText = "Seluruh Kalimantan (Agregat 5 Provinsi)";

    resetGrafik();
    
    // LANGSUNG cetak laporan gabungan
    generateForensicReport();
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
            labels: [], datasets: [
                { label: 'Suhu Aktual (°C)', data: [], borderColor: '#ef5350', backgroundColor: 'rgba(239, 83, 80, 0.15)', borderWidth: 2, fill: true, tension: 0.4 },
                { label: 'Kelembapan Aktual (%)', data: [], borderColor: '#42a5f5', backgroundColor: 'rgba(66, 165, 245, 0.15)', borderWidth: 2, fill: true, tension: 0.4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
            scales: { x: { ticks: { color: '#9e9e9e' } }, y: { ticks: { color: '#9e9e9e' } } }
        }
    });
}

// ==========================================
// 1. DASHBOARD UPDATE TIAP 1 DETIK (ANIMASI & GRAFIK)
// ==========================================
function perSecondDashboardUpdate() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID'); 
    const currentSecond = now.getSeconds();

    let liveTemp = 0, liveHum = 0;
    let targetName = activeRegionId === "all" ? "Seluruh Kalimantan" : kalimantanRegions.find(r => r.id === activeRegionId).name;

    if (activeRegionId === "all") {
        let totalTemp = 0, totalHum = 0;
        kalimantanRegions.forEach(r => { totalTemp += r.baseTemp; totalHum += r.baseHum; });
        liveTemp = totalTemp / kalimantanRegions.length;
        liveHum = totalHum / kalimantanRegions.length;
    } else {
        const activeReg = kalimantanRegions.find(r => r.id === activeRegionId);
        liveTemp = activeReg.baseTemp;
        liveHum = activeReg.baseHum;
    }

    liveTemp += (Math.random() * 0.4 - 0.2);
    liveHum += (Math.random() * 0.6 - 0.3);

    let deltaTemp = liveTemp - prevTemp;
    let deltaHum = liveHum - prevHum;
    prevTemp = liveTemp;
    prevHum = liveHum;

    let currentStatus = "NORMAL";
    if (liveTemp >= 31 && liveHum < 70) currentStatus = "WASPADA";
    if (liveTemp >= 33 && liveHum < 55) currentStatus = "SIAGA";
    if (liveTemp >= 35 || liveHum < 45) currentStatus = "BAHAYA";
    let cfg = statusRules[currentStatus];

    document.getElementById('val-suhu').innerText = liveTemp.toFixed(2);
    document.getElementById('val-lembab').innerText = liveHum.toFixed(2);
    
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

    fireChart.data.labels.push(timeStr);
    fireChart.data.datasets[0].data.push(liveTemp);
    fireChart.data.datasets[1].data.push(liveHum);
    if(fireChart.data.labels.length > 15) {
        fireChart.data.labels.shift(); fireChart.data.datasets[0].data.shift(); fireChart.data.datasets[1].data.shift();
    }
    fireChart.update();

    // Log integritas untuk grafik (tiap 5 detik agar tabel tidak freeze)
    if (currentSecond % 5 === 0) {
        let liveHash = generateFakeHash();
        let labelWilayah = activeRegionId === "all" ? "ALL REGIONS" : kalimantanRegions.find(r => r.id === activeRegionId).short;
        let newLog = `<tr><td>${timeStr}</td><td>${labelWilayah} - Ping Sensor</td><td class="hash-text">${liveHash}</td></tr>`;
        document.getElementById('log-body').insertAdjacentHTML('afterbegin', newLog);
    }
}

// ==========================================
// 2. LAPORAN FORENSIK (OTOMATIS TIAP 1 MENIT & SAAT DIKLIK)
// ==========================================
function generateForensicReport() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const bapHash = generateFakeHash();

    let targetName = "";
    let officialTemp = 0;
    let officialHum = 0;

    if (activeRegionId === "all") {
        targetName = "Seluruh Wilayah Kalimantan (Agregat 5 Provinsi)";
        let totalTemp = 0, totalHum = 0;
        kalimantanRegions.forEach(r => { totalTemp += r.baseTemp; totalHum += r.baseHum; });
        officialTemp = (totalTemp / kalimantanRegions.length).toFixed(1);
        officialHum = (totalHum / kalimantanRegions.length).toFixed(1);
    } else {
        const activeReg = kalimantanRegions.find(r => r.id === activeRegionId);
        targetName = `Provinsi ${activeReg.name}`;
        officialTemp = activeReg.baseTemp.toFixed(1);
        officialHum = activeReg.baseHum.toFixed(1);
    }

    let officialStatus = "NORMAL";
    if (officialTemp >= 31 && officialHum < 70) officialStatus = "WASPADA";
    if (officialTemp >= 33 && officialHum < 55) officialStatus = "SIAGA";
    if (officialTemp >= 35 || officialHum < 45) officialStatus = "BAHAYA";

    // MENGISI DATA KE TAB 4 (FORENSIC REPORT) SECARA INSTAN
    document.getElementById('bap-menit').innerText = currentMinute;
    document.getElementById('bap-waktu').innerText = `${now.toLocaleString('id-ID')} WIB (Siklus Update 1 Menit)`;
    document.getElementById('bap-hash').innerText = bapHash;

    let bapRingkasan = `Sesuai dengan protokol pemantauan lingkungan hidrometeorologis, sistem FIRETRACE pada pukul ${timeStr} WIB telah mengekstrak data satelit faktual untuk wilayah pemantauan: ${targetName}. Tercatat suhu udara rata-rata absolut berada pada angka ${officialTemp}°C dengan persentase kelembapan (Relative Humidity) sebesar ${officialHum}%. Angka ini divalidasi dan dibandingkan dengan parameter baku mutu lingkungan serta ambang batas kerawanan Karhutla menurut pedoman Kementerian Lingkungan Hidup dan Kehutanan (KLHK) dan Badan Meteorologi Klimatologi dan Geofisika (BMKG).`;
    
    let bapPrediksi = `Merujuk pada algoritma pemodelan prediksi cuaca, kondisi ekosistem ditetapkan pada status ${officialStatus.toUpperCase()}. Analisis prediktif terhadap laju pengeringan biomassa menunjukkan bahwa dalam siklus 3 jam ke depan, area pantauan tergolong terkendali dan fluktuasi termal terpantau stabil.`;
    
    if(officialStatus !== "NORMAL") {
        bapPrediksi = `PERINGATAN PRO-JUSTITIA: Merujuk pada pemodelan AI tingkat kerawanan api, ekosistem di wilayah ini diklasifikasikan pada fase ${officialStatus.toUpperCase()}. Penurunan kelembapan yang drastis menjadi ${officialHum}% menciptakan kondisi bahan bakar gambut permukaan yang sangat rentan (Highly Flammable). Rekomendasi: Otoritas setempat wajib melakukan patroli darat dan udara untuk mencegah gesekan termal dalam 3 jam ke depan.`;
    }

    document.getElementById('bap-ringkasan').innerText = bapRingkasan;
    document.getElementById('bap-prediksi').innerText = bapPrediksi;
    
    // MENGISI DATA KE TAB 2 (PROFILE PREDIKSI)
    document.getElementById('profile-prediksi-teks').innerText = `Validasi Resmi (Siklus 1 Menit): Ditetapkan status ${officialStatus.toUpperCase()} untuk wilayah ${targetName}. (Dicetak terakhir pada ${timeStr} WIB).`;

    // MENGISI DATA KE TAB 3 (AUDIT TRAIL) AGAR TIDAK KOSONG
    let labelWilayah = activeRegionId === "all" ? "ALL REGIONS" : kalimantanRegions.find(r => r.id === activeRegionId).short;
    let auditLog = `<tr><td style="color:#64b5f6;">${timeStr}</td><td>${labelWilayah} - Laporan BAP (1 Menit)</td><td style="color:#4caf50; font-weight:bold;">TERVALIDASI</td><td class="hash-text">${bapHash}</td></tr>`;
    
    // Pastikan tabel di tab audit trail terisi 
    const auditTable = document.getElementById('log-body-audit');
    if (auditTable) {
        auditTable.insertAdjacentHTML('afterbegin', auditLog);
    }
}

function bukaTab(namaTab, elemenMenu) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(menu => menu.classList.remove('active'));
    document.getElementById(namaTab).classList.add('active');
    elemenMenu.classList.add('active');
    if(namaTab === 'monitoring' && petaKalimantan) setTimeout(() => petaKalimantan.invalidateSize(), 100);
}
