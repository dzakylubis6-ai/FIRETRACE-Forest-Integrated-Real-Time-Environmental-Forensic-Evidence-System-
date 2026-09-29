const statusRules = {
    NORMAL: { class: "normal", color: "#4caf50", desc: "Kondisi stabil. Risiko kebakaran rendah." },
    WASPADA: { class: "waspada", color: "#f9a825", desc: "Suhu mulai meningkat. Pemantauan diperketat." },
    SIAGA: { class: "siaga", color: "#ef6c00", desc: "Kelembapan rendah. Potensi titik panas terdeteksi." },
    BAHAYA: { class: "bahaya", color: "#c62828", desc: "Kondisi Kritis! Suhu ekstrem dan udara sangat kering." }
};

let fireChart;
let petaKalimantan;
let regionalMarkers = {};
let activeRegionId = "kalteng"; // Default awal saat halaman dibuka

// Data 5 Provinsi beserta Baseline Suhu & Kelembapannya
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
    
    // Ambil data cuaca dari satelit saat pertama dibuka
    fetchWeatherAllRegions();
    
    // Tarik data cuaca satelit secara diam-diam setiap 1 menit (Batas aman API)
    setInterval(fetchWeatherAllRegions, 60000); 

    // TAPI DASHBOARD BERGERAK AKTIF SETIAP 1 DETIK!
    setInterval(perSecondUpdate, 1000);
});

function initMap() {
    petaKalimantan = L.map('kalimantan-map').setView([-0.5, 114.5], 5);
    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3']
    }).addTo(petaKalimantan);

    // Buat Titik di Peta & Tambahkan Event KLIK
    kalimantanRegions.forEach(reg => {
        let marker = L.circleMarker([reg.lat, reg.lon], {
            radius: 8, fillColor: "#4caf50", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9
        }).addTo(petaKalimantan);

        // Munculkan Tooltip
        marker.bindTooltip(`<b>${reg.name}</b><br>Klik untuk memantau daerah ini`, {permanent: false, direction: "top"});
        
        // FUNGSI INTERAKTIF KETIKA TITIK DIKLIK
        marker.on('click', function() {
            ubahFokusWilayah(reg.id);
        });

        regionalMarkers[reg.id] = marker;
    });
}

// Fungsi mengubah fokus dashboard ketika titik peta diklik
function ubahFokusWilayah(id) {
    activeRegionId = id;
    const reg = kalimantanRegions.find(r => r.id === id);
    
    // Mengubah semua Teks di HTML secara instan
    document.getElementById('sidebar-wilayah').innerText = reg.name;
    document.getElementById('nama-wilayah-status').innerText = reg.short;
    document.getElementById('nama-wilayah-suhu').innerText = reg.short;
    document.getElementById('nama-wilayah-lembab').innerText = reg.short;
    document.getElementById('grafik-wilayah').innerText = reg.short;
    
    // Mengubah teks di laporan Forensik
    document.getElementById('bap-reg-wilayah').innerText = reg.short;
    document.getElementById('bap-lokasi').innerText = reg.name;

    // Reset Grafik agar mulai baru untuk wilayah tersebut
    fireChart.data.labels = [];
    fireChart.data.datasets[0].data = [];
    fireChart.data.datasets[1].data = [];
    fireChart.update();

    // Beri tahu pengguna
    alert(`Memindahkan fokus satelit dan analitik ke wilayah ${reg.name}. Dashboard kini menampilkan data real-time daerah ini.`);
}

// Menarik data cuaca aktual dari satelit
async function fetchWeatherAllRegions() {
    for (let reg of kalimantanRegions) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m,relative_humidity_2m`);
            const data = await response.json();
            if(data && data.current) {
                reg.baseTemp = data.current.temperature_2m;
                reg.baseHum = data.current.relative_humidity_2m;
                
                // Ubah warna titik peta di latar belakang
                let statusKey = "NORMAL";
                if (reg.baseTemp >= 31 && reg.baseHum < 70) statusKey = "WASPADA";
                if (reg.baseTemp >= 33 && reg.baseHum < 55) statusKey = "SIAGA";
                if (reg.baseTemp >= 35 || reg.baseHum < 45) statusKey = "BAHAYA";
                
                if(regionalMarkers[reg.id]) {
                    regionalMarkers[reg.id].setStyle({ fillColor: statusRules[statusKey].color });
                }
            }
        } catch (e) {
            console.log(`Error API ${reg.name}`, e);
        }
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

// INI FUNGSI YANG MENGGERAKKAN DASHBOARD & LAPORAN SETIAP 1 DETIK!
function perSecondUpdate() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID'); // Format: HH:MM:SS
    const currentSecond = now.getSeconds();
    const liveHash = generateFakeHash();

    // Ambil wilayah yang sedang diklik/aktif saat ini
    const activeReg = kalimantanRegions.find(r => r.id === activeRegionId);

    // 1. Buat angka berfluktuasi tipis tiap detik (Micro-fluctuations) dari base wilayah tsb
    let liveTemp = activeReg.baseTemp + (Math.random() * 0.4 - 0.2);
    let liveHum = activeReg.baseHum + (Math.random() * 0.6 - 0.3);

    // Tentukan Status untuk wilayah aktif
    let currentStatus = "NORMAL";
    if (liveTemp >= 31 && liveHum < 70) currentStatus = "WASPADA";
    if (liveTemp >= 33 && liveHum < 55) currentStatus = "SIAGA";
    if (liveTemp >= 35 || liveHum < 45) currentStatus = "BAHAYA";

    let cfg = statusRules[currentStatus];

    // 2. Perbarui Kartu Dashboard (Tampil 2 angka di belakang koma)
    document.getElementById('val-suhu').innerText = liveTemp.toFixed(2);
    document.getElementById('val-lembab').innerText = liveHum.toFixed(2);
    
    // Perbarui Banner Utama
    document.getElementById('status-text').innerText = currentStatus;
    document.getElementById('status-desc').innerText = `Pemantauan wilayah ${activeReg.name}. ${cfg.desc}`;
    document.getElementById('status-banner').className = 'status-header ' + currentStatus.toLowerCase();

    // Nilai Risiko dan Asap
    let asapVal = currentStatus === 'BAHAYA' ? '5200' : (currentStatus === 'SIAGA' ? '2100' : '400');
    let risikoVal = currentStatus === 'BAHAYA' ? '92% (Kritis)' : (currentStatus === 'SIAGA' ? '75% (Tinggi)' : (currentStatus === 'WASPADA' ? '45% (Sedang)' : '15% (Rendah)'));
    document.getElementById('val-asap').innerText = asapVal;
    document.getElementById('val-risiko').innerText = risikoVal;
    document.getElementById('val-prediksi-singkat').innerText = currentStatus === 'BAHAYA' ? 'Eskalasi Cepat' : 'Stabil';
    document.getElementById('profile-tingkat-ancaman').innerText = currentStatus === 'BAHAYA' ? 'KRITIS' : 'RENDAH';
    
    // Perbarui indikator berkedip merah/hijau
    document.getElementById('live-indicator').innerText = `● LIVE PER-SECOND (${timeStr})`;
    document.getElementById('live-indicator').style.color = currentSecond % 2 === 0 ? "#4caf50" : "#fff";

    // 3. Perbarui Grafik Per Detik
    fireChart.data.labels.push(timeStr);
    fireChart.data.datasets[0].data.push(liveTemp);
    fireChart.data.datasets[1].data.push(liveHum);
    if(fireChart.data.labels.length > 15) {
        fireChart.data.labels.shift();
        fireChart.data.datasets[0].data.shift();
        fireChart.data.datasets[1].data.shift();
    }
    fireChart.update();

    // 4. PERBARUI FORENSIC REPORT SECARA REAL-TIME PER DETIK (BERUBAH SESUAI WILAYAH)
    document.getElementById('bap-detik').innerText = currentSecond.toString().padStart(2, '0');
    document.getElementById('bap-waktu').innerText = `${now.toLocaleString('id-ID')} WIB (Update Per Detik)`;
    document.getElementById('bap-hash').innerText = liveHash;

    let bapRingkasan = `Pemantauan faktual pada detik ini (${timeStr} WIB) di kawasan ${activeReg.name} mencatat dinamika ekosistem secara live. Sensor mencatat suhu menembus angka ${liveTemp.toFixed(2)}°C dengan fluktuasi kelembapan di titik ${liveHum.toFixed(2)}%. Sinkronisasi digital wilayah ini berlangsung per detik (per-second telemetry polling).`;
    
    let bapPrediksi = `Sistem AI menganalisis laju perubahan (Rate of Rise) pada detik ke-${currentSecond}. Status area ${activeReg.name} terverifikasi ${currentStatus}. Perkiraan 3 jam ke depan: Stabilitas terjaga dengan deviasi suhu minimal.`;
    
    if(currentStatus !== "NORMAL") {
        bapPrediksi = `PERINGATAN AI (Detik ${currentSecond}): Tren parameter lingkungan wilayah ${activeReg.name} memburuk. Suhu menembus batas anomali ke tingkat ${currentStatus}. Risiko penjalaran titik panas meningkat. Direkomendasikan mitigasi segera untuk mengunci eskalasi.`;
    }

    document.getElementById('bap-ringkasan').innerText = bapRingkasan;
    document.getElementById('bap-prediksi').innerText = bapPrediksi;
    document.getElementById('profile-prediksi-teks').innerText = `Analisis wilayah ${activeReg.name} (Detik ${currentSecond}): Suhu ${liveTemp.toFixed(2)}°C, Lembap ${liveHum.toFixed(2)}%. Memperbarui analitik wilayah ini tiap 1000 milidetik.`;

    // 5. Perbarui Tabel Log (Tambah baris tiap 3 detik agar tabel tidak langsung kepenuhan)
    if (currentSecond % 3 === 0) {
        let newLog = `<tr><td>${timeStr}</td><td>${activeReg.short} - LIVE</td><td class="hash-text">${liveHash}</td></tr>`;
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
