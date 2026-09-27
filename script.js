// Konfigurasi Deskripsi Status
const statusConfig = {
    "NORMAL": { class: "normal", desc: "Pemantauan rutin dan perekaman data baseline berkala.", t: 27, h: 82, s: 400, uv: 0 },
    "WASPADA": { class: "waspada", desc: "Peningkatan frekuensi sampling. Tren anomali terdeteksi.", t: 29, h: 70, s: 850, uv: 0 },
    "SIAGA": { class: "siaga", desc: "Verifikasi visual drone aktif. Sinyal peringatan awal dikirim.", t: 31, h: 60, s: 1500, uv: 50 },
    "BAHAYA": { class: "bahaya", desc: "Buzzer lokal menyala. Perekaman krisis pada Environmental Event Log dimulai.", t: 33, h: 50, s: 3500, uv: 150 },
    "AWAS": { class: "awas", desc: "Penguncian hash aktif. Draf Environmental Forensic Report disusun real-time.", t: 35, h: 45, s: 6000, uv: 250 }
};

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

// Inisialisasi Grafik
document.addEventListener("DOMContentLoaded", function() {
    const ctx = document.getElementById('fireChart').getContext('2d');
    const fireChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['T-24j', 'T-1j', 'T0 (Api)', 'T+30m', 'T+1j', 'T+6j'],
            datasets: [
                { label: 'Suhu (°C)', data: [27, 29, 32, 33, 31, 28], borderColor: '#ef5350', backgroundColor: 'transparent', tension: 0.4 },
                { label: 'Kelembapan (%)', data: [82, 70, 55, 50, 53, 65], borderColor: '#42a5f5', backgroundColor: 'transparent', tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { ticks: { color: '#9e9e9e' }, grid: { color: '#333' } },
                y: { ticks: { color: '#9e9e9e' }, grid: { color: '#333' } }
            }
        }
    });
    ubahStatus('NORMAL');
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
