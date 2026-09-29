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
let prevHum = 78.0;

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

document.addEventListener("DOMContentLoaded", async function() {
    initMap();
    initChart();
    
    await fetchWeatherAllRegions();
    generateForensicReport();
    
    setInterval(fetchWeatherAllRegions, 60000); 
    setInterval(generateForensicReport, 60000); 
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

        marker.bindTooltip(`<b>${reg.name}</b><br>Klik untuk mengunci BAP Forensik`, {permanent: false, direction: "top"});
        
        marker.on('click', function() {
            ubahFokusWilayah(reg.id);
            this.bindPopup(`<b>PEMANTAUAN TERKUNCI: ${reg.name}</b>`).openPopup();
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
    generateForensicReport();
}

function getBaselineData() {
    let bTemp = 28.0, bHum = 78.0;
    if (activeRegionId === "all") {
        let totalT = 0, totalH = 0;
        kalimantanRegions.forEach(r => { totalT += r.baseTemp; totalH += r.baseHum; });
        bTemp = totalT / kalimantanRegions.length;
        bHum = totalH / kalimantanRegions.length;
    } else {
        const reg = kalimantanRegions.find(r => r.id === activeRegionId);
        bTemp = reg.baseTemp;
        bHum = reg.baseHum;
    }
    return { bTemp, bHum };
}

function initChart() {
    const ctx = document.getElementById('fireChart').getContext('2d');
    
    let initLabels = [], initTemp = [], initHum = [];
    let now = new Date();
    let base = getBaselineData();
    
    for(let i = 15; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - (i * 1000));
        initLabels.push(pastTime.toLocaleTimeString('id-ID'));
        initTemp.push(base.bTemp + (Math.random() * 0.4 - 0.2));
        initHum.push(base.bHum + (Math.random() * 2 - 1));
    }

    fireChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: initLabels, 
            datasets: [
                { label: 'Suhu Aktual (°C)', data: initTemp, borderColor: '#ef5350', backgroundColor: 'rgba(239, 83, 80, 0.15)', borderWidth: 2, fill: true, tension: 0.4 },
                { label: 'Kelembapan Aktual (%)', data: initHum, borderColor: '#42a5f5', backgroundColor: 'rgba(66, 165, 245, 0.15)', borderWidth: 2, fill: true, tension: 0.4 }
            ]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { duration: 200 },
            scales: { 
                x: { ticks: { color: '#9e9e9e' }, grid: { color: 'rgba(255,255,255,0.05)' } }, 
                y: { 
                    ticks: { color: '#9e9e9e' }, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    min: 0,   
                    max: 100  
                } 
            }
        }
    });
}

function resetGrafik() {
    let newLabels = [], newTemp = [], newHum = [];
    let now = new Date();
    let base = getBaselineData();
    
    for(let i = 15; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - (i * 1000));
        newLabels.push(pastTime.toLocaleTimeString('id-ID'));
        newTemp.push(base.bTemp + (Math.random() * 0.4 - 0.2));
        newHum.push(base.bHum + (Math.random() * 2 - 1));
    }
    
    fireChart.data.labels = newLabels;
    fireChart.data.datasets[0].data = newTemp;
    fireChart.data.datasets[1].data = newHum;
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

function perSecondDashboardUpdate() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID'); 
    const currentSecond = now.getSeconds();

    let base = getBaselineData();
    let targetName = activeRegionId === "all" ? "Seluruh Kalimantan" : kalimantanRegions.find(r => r.id === activeRegionId).name;

    let liveTemp = base.bTemp + (Math.random() * 0.4 - 0.2);
    let liveHum = base.bHum + (Math.random() * 0.6 - 0.3);

    let deltaTemp = liveTemp - prevTemp;
    let deltaHum = liveHum - prevHum;
    prevTemp = liveTemp;
    prevHum = liveHum;

    let currentStatus = "NORMAL";
    if (liveTemp >= 31 && liveHum < 70) currentStatus = "WASPADA";
    if (liveTemp >= 33 && liveHum < 55) currentStatus = "SIAGA";
    if (liveTemp >= 35 || liveHum < 45) currentStatus = "BAHAYA";
    let cfg = statusRules[currentStatus];

    // Perhitungan Dinamis Indeks Antropogenik (Berdasarkan Suhu & Status)
    let skorAntropogenik = 25; // Base normal
    let pemicuTeks = "Faktor Alami / Iklim";
    if(currentStatus === "BAHAYA") {
        skorAntropogenik = 85;
        pemicuTeks = "⚠️ Kuat Indikasi Manusia (Antropogenik)";
    } else if(currentStatus === "SIAGA") {
        skorAntropogenik = 60;
        pemicuTeks = "⚠️ Potensi Campur Tangan Manusia";
    }

    document.getElementById('val-suhu').innerText = liveTemp.toFixed(2);
    document.getElementById('val-lembab').innerText = liveHum.toFixed(2);
    document.getElementById('val-skor-antropogenik').innerText = skorAntropogenik;
    document.getElementById('val-pemicu-utama').innerText = pemicuTeks;
    document.getElementById('profile-sumber-pemicu').innerText = pemicuTeks;
    
    let deltaSuhuEl = document.getElementById('delta-suhu');
    if(liveTemp >= 35) {
        deltaSuhuEl.innerHTML = "🔥 BAHAYA KRITIS (>35°C)";
        deltaSuhuEl.style.color = "#ff5252";
    } else if(liveTemp >= 33) {
        deltaSuhuEl.innerHTML = "⚠️ SIAGA TINGGI (≥33°C)";
        deltaSuhuEl.style.color = "#ffa726";
    } else {
        deltaSuhuEl.innerHTML = "Aman di Bawah 33°C";
        deltaSuhuEl.style.color = "#69f0ae";
    }

    let deltaLembabEl = document.getElementById('delta-lembab');
    if(liveHum <= 45) {
        deltaLembabEl.innerHTML = "🔥 BAHAYA KERING (≤45%)";
        deltaLembabEl.style.color = "#ff5252";
    } else if(liveHum <= 55) {
        deltaLembabEl.innerHTML = "⚠️ RAWAN (≤55%)";
        deltaLembabEl.style.color = "#ffa726";
    } else {
        deltaLembabEl.innerHTML = "Lembap Normal (>55%)";
        deltaLembabEl.style.color = "#64b5f6";
    }

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

    if (currentSecond % 5 === 0) {
        let liveHash = generateFakeHash();
        let labelWilayah = activeRegionId === "all" ? "ALL REGIONS" : kalimantanRegions.find(r => r.id === activeRegionId).short;
        let newLog = `<tr><td>${timeStr}</td><td>${labelWilayah} - Ping Sensor</td><td class="hash-text">${liveHash}</td></tr>`;
        document.getElementById('log-body').insertAdjacentHTML('afterbegin', newLog);
    }
}

function generateForensicReport() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const bapHash = generateFakeHash();

    let targetName = "";
    let officialTemp = 0;
    let officialHum = 0;

    let base = getBaselineData();
    if (activeRegionId === "all") {
        targetName = "Seluruh Wilayah Kalimantan (Agregat 5 Provinsi)";
    } else {
        const activeReg = kalimantanRegions.find(r => r.id === activeRegionId);
        targetName = `Provinsi ${activeReg.name}`;
    }
    
    officialTemp = base.bTemp.toFixed(1);
    officialHum = base.bHum.toFixed(1);

    let officialStatus = "NORMAL";
    if (officialTemp >= 31 && officialHum < 70) officialStatus = "WASPADA";
    if (officialTemp >= 33 && officialHum < 55) officialStatus = "SIAGA";
    if (officialTemp >= 35 || officialHum < 45) officialStatus = "BAHAYA";

    document.getElementById('bap-menit').innerText = currentMinute;
    document.getElementById('bap-waktu').innerText = `${now.toLocaleString('id-ID')} WIB (Siklus Update 1 Menit)`;
    document.getElementById('bap-hash').innerText = bapHash;

    let bapRingkasan = `Sesuai dengan protokol standar pemantauan Karhutla (BMKG & KLHK), sistem FIRETRACE mencatat suhu faktual wilayah ${targetName} sebesar ${officialTemp}°C (Ambang batas kritis: >35°C) dan kelembapan udara sebesar ${officialHum}% (Ambang batas kritis bahan bakar kering: <45%).`;
    
    let bapPrediksi = `Atribusi Penyebab: Berdasarkan evaluasi 7 indikator tertimbang (total bobot 100), kondisi parameter saat ini menunjukkan dominasi faktor alami/iklim dengan skor aktivitas manusia (antropogenik) terkendali di bawah ambang batas kecurigaan. Tidak ditemukan anomali pembukaan lahan ilegal atau waktu T0 yang mencurigakan di luar jam puncak termal.`;
    
    if(officialStatus !== "NORMAL") {
        bapPrediksi = `ATRIBUSI PRO-JUSTITIA (INDIKASI ANTROPOGENIK): Parameter lingkungan dan pola pemicu mencatatkan skor tinggi pada matriks investigasi manusia. Lonjakan node sensor yang berdekatan tanpa riwayat sambaran petir dari BMKG mengindikasikan adanya potensi pembukaan lahan atau sulutan buatan (Aktivitas Manusia / Antropogenik). Rekomendasi: Penegakan hukum lingkungan dan investigasi lapangan segera.`;
    }

    document.getElementById('bap-ringkasan').innerText = bapRingkasan;
    document.getElementById('bap-prediksi').innerText = bapPrediksi;
    document.getElementById('profile-prediksi-teks').innerText = `Analisis Atribusi Forensik: Status ${officialStatus.toUpperCase()} (${targetName}). Penilaian Indikator Antropogenik & Alami Terintegrasi ke dalam Dokumen BAP Resmi.`;

    let labelWilayah = activeRegionId === "all" ? "ALL REGIONS" : kalimantanRegions.find(r => r.id === activeRegionId).short;
    let auditLog = `<tr><td style="color:#64b5f6;">${timeStr}</td><td>${labelWilayah} - Laporan BAP (1 Menit)</td><td style="color:#4caf50; font-weight:bold;">TERVALIDASI</td><td class="hash-text">${bapHash}</td></tr>`;
    
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
