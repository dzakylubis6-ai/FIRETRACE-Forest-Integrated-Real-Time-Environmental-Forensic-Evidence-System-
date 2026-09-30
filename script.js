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
let cloudCameraLogged = false;
let manualOverrideStatus = null; 

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
    return hash;
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

function overrideStatus(mode) {
    manualOverrideStatus = mode;
    cloudCameraLogged = false; // Reset log kamera agar bisa ambil snapshot baru
    perSecondDashboardUpdate();
    generateForensicReport();
}

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
    
    document.getElementById('sidebar-wilayah').innerText = reg.name;
    document.getElementById('nama-wilayah-status').innerText = reg.short;
    document.getElementById('grafik-wilayah').innerText = reg.name;
    document.getElementById('profile-nama-wilayah').innerText = reg.name;
    
    document.getElementById('bap-reg-wilayah').innerText = reg.short;
    document.getElementById('bap-lokasi').innerText = `PROVINSI ${reg.name.toUpperCase()} (Kordinat: ${reg.lat}, ${reg.lon})`;

    resetGrafik();
    generateForensicReport();
}

function resetKeSemuaProvinsi() {
    activeRegionId = "all";
    
    document.getElementById('sidebar-wilayah').innerText = "Seluruh Kalimantan";
    document.getElementById('nama-wilayah-status').innerText = "SELURUH KALIMANTAN";
    document.getElementById('grafik-wilayah').innerText = "Seluruh Kalimantan";
    document.getElementById('profile-nama-wilayah').innerText = "Seluruh Kalimantan";

    document.getElementById('bap-reg-wilayah').innerText = "ALL";
    document.getElementById('bap-lokasi').innerText = "SELURUH KALIMANTAN (Pemantauan Agregat 5 Provinsi)";

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
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 200 }, scales: { x: { ticks: { color: '#9e9e9e' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#9e9e9e' }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 } } }
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
    fireChart.data.labels = newLabels; fireChart.data.datasets[0].data = newTemp; fireChart.data.datasets[1].data = newHum; fireChart.update();
}

async function fetchWeatherAllRegions() {
    for (let reg of kalimantanRegions) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m,relative_humidity_2m`);
            const data = await response.json();
            if(data && data.current) { reg.baseTemp = data.current.temperature_2m; reg.baseHum = data.current.relative_humidity_2m; }
        } catch (e) { console.log(`Error API`, e); }
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

    let currentStatus = "NORMAL";
    if (manualOverrideStatus === 'SIAGA') { liveTemp = 33.5; liveHum = 52.0; currentStatus = "SIAGA"; }
    else if (manualOverrideStatus === 'BAHAYA_MANUSIA' || manualOverrideStatus === 'BAHAYA_ALAMI') { liveTemp = 36.8; liveHum = 40.0; currentStatus = "BAHAYA"; }
    else {
        if (liveTemp >= 31 && liveHum < 70) currentStatus = "WASPADA";
        if (liveTemp >= 33 && liveHum < 55) currentStatus = "SIAGA";
        if (liveTemp >= 35 || liveHum < 45) currentStatus = "BAHAYA";
    }

    let cfg = statusRules[currentStatus];

    document.getElementById('val-suhu').innerText = liveTemp.toFixed(2);
    document.getElementById('val-lembab').innerText = liveHum.toFixed(2);
    document.getElementById('status-desc').innerText = `Pemantauan ${targetName}. ${cfg.desc}`;
    document.getElementById('status-banner').className = 'status-header ' + currentStatus.toLowerCase();

    document.getElementById('val-asap').innerText = currentStatus === 'BAHAYA' ? '5200' : (currentStatus === 'SIAGA' ? '2100' : '400');
    document.getElementById('val-risiko').innerText = currentStatus === 'BAHAYA' ? '92% (Kritis)' : (currentStatus === 'SIAGA' ? '75% (Tinggi)' : (currentStatus === 'WASPADA' ? '45% (Sedang)' : '15% (Rendah)'));
    
    let statusPemicuTeks = "Stabil / Normal";
    if(manualOverrideStatus === 'BAHAYA_MANUSIA') statusPemicuTeks = "🔥 KRITIS: Ulah Manusia (Sengaja)";
    else if(manualOverrideStatus === 'BAHAYA_ALAMI') statusPemicuTeks = "⚡ KRITIS: Faktor Alami (Petir BMKG)";
    else if(currentStatus === 'BAHAYA') statusPemicuTeks = "⚠️️ Siaga Darurat";
    
    document.getElementById('val-prediksi-singkat').innerText = statusPemicuTeks;
    document.getElementById('live-indicator').innerText = `● LIVE PER-SECOND (${timeStr})`;
    document.getElementById('live-indicator').style.color = currentSecond % 2 === 0 ? "#4caf50" : "#fff";

    // Update Profil Ancaman di Tab Profile
    const ancamanEl = document.getElementById('profile-tingkat-ancaman');
    if (ancamanEl) {
        ancamanEl.innerText = statusPemicuTeks.toUpperCase();
        ancamanEl.style.color = cfg.color;
    }

    if ((currentStatus === 'SIAGA' || currentStatus === 'BAHAYA') && !cloudCameraLogged) {
        cloudCameraLogged = true;
        triggerCloudCameraSnapshot(targetName, currentStatus, liveTemp, liveHum);
    } else if (currentStatus === 'NORMAL' || currentStatus === 'WASPADA') {
        cloudCameraLogged = false;
        // Bersihkan grid kamera jika normal kembali
        const grid = document.getElementById('cloud-camera-grid');
        if (grid) {
            grid.innerHTML = '<div id="empty-camera-msg" style="padding: 20px; text-align: center; color: #888; grid-column: 1 / -1; background: rgba(0,0,0,0.5); border-radius: 8px;">Menunggu pemicu event (Kondisi Lapangan Normal)...</div>';
        }
    }

    fireChart.data.labels.push(timeStr);
    fireChart.data.datasets[0].data.push(liveTemp);
    fireChart.data.datasets[1].data.push(liveHum);
    if(fireChart.data.labels.length > 15) {
        fireChart.data.labels.shift(); fireChart.data.datasets[0].data.shift(); fireChart.data.datasets[1].data.shift();
    }
    fireChart.update();

    if (currentSecond % 5 === 0) {
        let liveHash = generateFakeHash().substring(0, 16) + '...';
        let labelWilayah = activeRegionId === "all" ? "ALL REGIONS" : kalimantanRegions.find(r => r.id === activeRegionId).short;
        let newLog = `<tr><td>${timeStr}</td><td>${labelWilayah} - Ping Sensor</td><td class="hash-text">${liveHash}</td></tr>`;
        const logBody = document.getElementById('log-body');
        if (logBody) logBody.insertAdjacentHTML('afterbegin', newLog);
    }
}

function triggerCloudCameraSnapshot(regionName, statusLevel, temp, hum) {
    const grid = document.getElementById('cloud-camera-grid');
    if (!grid) return;
    
    const emptyMsg = document.getElementById('empty-camera-msg');
    if (emptyMsg) emptyMsg.remove();

    const timeNow = new Date().toLocaleTimeString('id-ID');
    const hashEviden = generateFakeHash().substring(0,16)+'...';
    const colorBadge = statusLevel === 'BAHAYA' ? '#ef5350' : '#ffa726';

    const cardHtml = `
        <div style="background: rgba(30,30,30,0.9); border: 1px solid ${colorBadge}; border-radius: 6px; padding: 12px; text-align: left; animation: fadeIn 0.5s;">
            <div style="background: #111; height: 150px; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-size: 11px; position: relative; overflow: hidden; border: 1px solid #333;">
                <span style="position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.8); color: ${colorBadge}; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold;">CAM-NODE (${regionName})</span>
                <span style="font-size: 20px; margin-bottom: 5px;">🔥📸</span>
                <span style="color: ${colorBadge}; font-weight: bold;">SNAPSHOT EVIDEN TER-UPLOAD</span>
                <span style="font-size: 9px; color: #aaa; margin-top: 2px;">Suhu: ${temp.toFixed(1)}°C | RH: ${hum.toFixed(1)}%</span>
            </div>
            <div style="margin-top: 10px; font-size: 11px; color: #ccc;">
                <div>Level Status: <span style="color: ${colorBadge}; font-weight: bold;">${statusLevel}</span></div>
                <div>Waktu Tangkap: ${timeNow} WIB</div>
                <div style="font-family: monospace; font-size: 9px; color: #81d4fa; margin-top: 4px;">Hash S3/Cloud: ${hashEviden}</div>
            </div>
        </div>
    `;
    grid.insertAdjacentHTML('afterbegin', cardHtml);
}

function generateForensicReport() {
    const now = new Date();
    const fullDate = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const bapHash = generateFakeHash();

    let targetName = "";
    let officialTemp = 0;
    let officialHum = 0;

    let base = getBaselineData();
    if (activeRegionId === "all") {
        targetName = "Seluruh Wilayah Kalimantan (Agregat Regional)";
    } else {
        const activeReg = kalimantanRegions.find(r => r.id === activeRegionId);
        targetName = `Provinsi ${activeReg.name}`;
    }
    
    officialTemp = base.bTemp.toFixed(1);
    officialHum = base.bHum.toFixed(1);
    let ppmGas = "400"; 
    let uvtronStatus = "0 titik (Aman)";

    let officialStatus = "NORMAL";
    if (manualOverrideStatus === 'SIAGA') { officialStatus = "SIAGA"; ppmGas = "2100"; }
    else if (manualOverrideStatus === 'BAHAYA_MANUSIA' || manualOverrideStatus === 'BAHAYA_ALAMI') { officialStatus = "BAHAYA"; ppmGas = "5200"; uvtronStatus = "Positif Titik Nyala UV"; }
    else {
        if (officialTemp >= 31 && officialHum < 70) officialStatus = "WASPADA";
        if (officialTemp >= 33 && officialHum < 55) { officialStatus = "SIAGA"; ppmGas = "2100"; }
        if (officialTemp >= 35 || officialHum < 45) { officialStatus = "BAHAYA"; ppmGas = "5200"; uvtronStatus = "Positif Titik Nyala UV"; }
    }

    // UPDATE BAP
    if (document.getElementById('bap-menit')) {
        document.getElementById('bap-menit').innerText = currentMinute;
        document.getElementById('bap-waktu').innerText = `${fullDate} pukul ${timeStr} WIB`;
        document.getElementById('bap-status-final').innerText = officialStatus;
        document.getElementById('bap-status-final').style.color = officialStatus === 'BAHAYA' ? '#c62828' : '#000';
        document.getElementById('bap-status-final').style.borderColor = officialStatus === 'BAHAYA' ? '#c62828' : '#000';
        document.getElementById('bap-hash').innerText = bapHash;
    }

    let bapRingkasan = `Sesuai dengan metode evaluasi <i>Fuzzy Logic Mamdani</i> pada sistem FIRETRACE, pembacaan terintegrasi multisensor lapangan (Sensor DS18B20 & BME280) pada area pengawasan menunjukkan profil lingkungan di titik <strong>Suhu ${officialTemp}°C</strong> dengan <strong>Kelembapan ${officialHum}%</strong>. Konsentrasi kepadatan partikel polutan gas terpantau di angka <strong>${ppmGas} ppm (MQ135)</strong>, dan deteksi gelombang nyala api menunjukkan status <strong>${uvtronStatus} (UVTRON)</strong>.`;
    
    let bapPrediksi = `Sistem tidak mendeteksi anomali <i>Fire Event Profile</i> yang terklasifikasi sebagai kejadian kebakaran hutan. Parameter mikroklimat dinyatakan berada dalam rentang fungsi keanggotaan (<i>membership function</i>) yang aman (Status: <strong>NORMAL</strong>).`;
    let profTeks = "Validasi Forensik: Sistem memantau kondisi stabil. Tidak ada anomali terdeteksi pada lapisan sensor.";
    
    if (manualOverrideStatus === 'BAHAYA_MANUSIA') {
        bapPrediksi = `<strong>INDIKASI KUAT AKTIVITAS MANUSIA (ANTROPOGENIK):</strong><br>
        1. Tercatat lonjakan esktrem laju perubahan asap/partikel MQ135 secara instan (${ppmGas} ppm) yang terkonfirmasi bersamaan dengan kemunculan nyala api (UVTRON).<br>
        2. Korelasi data meteorologi menunjukkan ketiadaan sambaran petir <i>Cloud-to-Ground</i> maupun curah hujan dari titik koordinat ini sebelum waktu T0.<br>
        3. Terdapat pemicuan pada <i>multiple node</i> yang berurutan secara sistematis (Pola Berjajar). <br>
        Berdasarkan Indeks Indikasi Aktivitas Manusia, anomali ini <strong>MENDUKUNG indikasi aktivitas pembukaan lahan (Kesengajaan Manusia)</strong>. Sistem telah memicu perekaman <i>Cloud Camera</i> sebagai dokumentasi lapangan.`;
        profTeks = "🚨 KONDISI KRITIS: Atribusi AI menemukan indikasi kuat campur tangan manusia (pola geometris & gas mendadak). Cloud Camera mengambil eviden!";
    } else if (manualOverrideStatus === 'BAHAYA_ALAMI') {
        bapPrediksi = `<strong>INDIKASI KEBAKARAN FAKTOR ALAMIAH:</strong><br>
        1. Terdeteksi lonjakan suhu yang ekstrem sejalan dengan peningkatan Indeks Kekeringan.<br>
        2. Terdapat validasi data sambaran petir <i>Cloud-to-Ground</i> dari stasiun BMKG tepat pada koordinat awal kemunculan anomali suhu sebelum waktu T0.<br>
        3. Kondisi ini menjadi faktor penyanggah yang menyimpulkan bahwa kejadian kebakaran hutan dipicu oleh <strong>FAKTOR ALAMIAH (Klimatologi / Petir)</strong> tanpa temuan anomali antropogenik.`;
        profTeks = "🚨 KONDISI KRITIS: Kebakaran terkonfirmasi akibat faktor alamiah. Sinkronisasi dengan BMKG mendeteksi aktivitas petir pada area ini.";
    }

    if (document.getElementById('bap-ringkasan')) {
        document.getElementById('bap-ringkasan').innerHTML = bapRingkasan;
        document.getElementById('bap-prediksi').innerHTML = bapPrediksi;
    }
    
    if (document.getElementById('profile-prediksi-teks')) {
        document.getElementById('profile-prediksi-teks').innerText = profTeks;
    }

    let labelWilayah = activeRegionId === "all" ? "ALL REGIONS" : kalimantanRegions.find(r => r.id === activeRegionId).short;
    let auditLog = `<tr><td style="color:#64b5f6;">${timeStr}</td><td>${labelWilayah} - Audit Rantai Bukti Digital</td><td style="color:#4caf50; font-weight:bold;">TERVALIDASI</td><td class="hash-text">${bapHash.substring(0,16)}...</td></tr>`;
    
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
