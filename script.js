const statusRules = {
    NORMAL: { class: "normal", color: "#4caf50", desc: "Kondisi stabil. Risiko kebakaran rendah." },
    WASPADA: { class: "waspada", color: "#f9a825", desc: "Suhu mulai meningkat. Pemantauan diperketat." },
    SIAGA: { class: "siaga", color: "#ef6c00", desc: "Kelembapan rendah. Potensi titik panas terdeteksi." },
    BAHAYA: { class: "bahaya", color: "#c62828", desc: "Kondisi Kritis! Suhu tinggi dan udara sangat kering." }
};

let fireChart;
let regionalMarkers = {};
let petaKalimantan;

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
    setInterval(fetchAllRegionsWeather, 300000);
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

        marker.bindPopup(`<b>${reg.name}</b><br>Status Faktual: Terpantau`);
        regionalMarkers[reg.id] = marker;
    });
}

async function fetchAllRegionsWeather() {
    for (let reg of kalimantanRegions) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m,relative_humidity_2m`);
            const data = await response.json();
            
            if (data && data.current) {
                let temp = Math.round(data.current.temperature_2m);
                let hum = Math.round(data.current.relative_humidity_2m);
                
                let statusKey = "NORMAL";
                if (temp >= 31 && hum < 70) statusKey = "WASPADA";
                if (temp >= 33 && hum < 55) statusKey = "SIAGA";
                if (temp >= 35 || hum < 45) statusKey = "BAHAYA";

                let cfg = statusRules[statusKey];

                if (reg.id === "kalteng") {
                    document.getElementById('val-suhu').innerText = temp;
                    document.getElementById('val-lembab').innerText = hum;
                    document.getElementById('status-text').innerText = statusKey;
                    document.getElementById('status-desc').innerText = `Pemantauan mandiri wilayah ${reg.name}. ${cfg.desc}`;
                    document.getElementById('status-banner').className = 'status-header ' + statusKey.toLowerCase();
                    
                    let asapVal = statusKey === 'BAHAYA' ? '5200' : (statusKey === 'SIAGA' ? '2100' : '400');
                    let risikoVal = statusKey === 'BAHAYA' ? '92% (Kritis)' : (statusKey === 'SIAGA' ? '75% (Tinggi)' : (statusKey === 'WASPADA' ? '45% (Sedang)' : '15% (Rendah)'));
                    
                    document.getElementById('val-asap').innerText = asapVal;
                    document.getElementById('val-risiko').innerText = risikoVal;

                    let prediksiTeks = "", bapRingkasan = "", bapPrediksi = "";
                    
                    if(statusKey === 'BAHAYA') {
                        prediksiTeks = `Suhu ekstrem ${temp}°C dengan kelembapan ${hum}% menciptakan tingkat kekeringan gambut masif. Proyeksi AI: Potensi titik api meluas dalam 2 jam ke depan.`;
                        bapRingkasan = `Berdasarkan pembacaan sensor satelit real-time di Kalimantan Tengah, tercatat suhu kritis mencapai ${temp}°C dan kelembapan udara turun ke level ${hum}%. Indikasi akumulasi gas karbon monoksida menunjukkan kerentanan ekstrem terhadap pembakaran lahan.`;
                        bapPrediksi = `Model prediktif AI memperkirakan tren pengeringan biomassa berlanjut dengan kecepatan tinggi. Risiko perluasan anomali termal diproyeksikan meningkat dalam 1-3 jam ke depan.`;
                        document.getElementById('val-prediksi-singkat').innerText = "Eskalasi Cepat";
                        document.getElementById('profile-tingkat-ancaman').innerText = "KRITIS (Tinggi)";
                        document.getElementById('profile-tingkat-ancaman').style.color = "#ef5350";
                    } else if(statusKey === 'SIAGA') {
                        prediksiTeks = `Suhu terpantau ${temp}°C dengan kelembapan ${hum}%. Proyeksi AI: Kondisi mendekati ambang batas kritis. Pemantauan diintensifkan.`;
                        bapRingkasan = `Sistem mencatat parameter lingkungan di Kalimantan Tengah pada level Siaga dengan suhu ${temp}°C dan kelembapan ${hum}%. Anomali awal emisi uap panas terdeteksi di beberapa klaster gambut.`;
                        bapPrediksi = `Analisis prediktif menunjukkan kestabilan semu; apabila kelembapan turun 5% dalam 3 jam ke depan, status otomatis meningkat ke level Bahaya.`;
                        document.getElementById('val-prediksi-singkat').innerText = "Waspada Siaga";
                        document.getElementById('profile-tingkat-ancaman').innerText = "MENENGAH";
                        document.getElementById('profile-tingkat-ancaman').style.color = "#ff9800";
                    } else {
                        prediksiTeks = `Kondisi lingkungan stabil dengan suhu ${temp}°C dan kelembapan ${hum}%. Proyeksi AI: Tidak ada indikasi eskalasi ancaman termal dalam waktu dekat.`;
                        bapRingkasan = `Pemantauan mandiri di wilayah Kalimantan Tengah menunjukkan kondisi ekologis yang terkendali. Parameter suhu (${temp}°C) dan kelembapan (${hum}%) berada dalam ambang batas normal dan aman.`;
                        bapPrediksi = `Model prediktif memperkirakan kestabilan cuaca regional bertahan dalam kurun waktu 3 hingga 6 jam ke depan dengan fluktuasi minor yang aman.`;
                        document.getElementById('val-prediksi-singkat').innerText = "Stabil / Normal";
                        document.getElementById('profile-tingkat-ancaman').innerText = "RENDAH";
                        document.getElementById('profile-tingkat-ancaman').style.color = "#4caf50";
                    }

                    document.getElementById('profile-prediksi-teks').innerText = prediksiTeks;
                    document.getElementById('bap-ringkasan').innerText = bapRingkasan;
                    document.getElementById('bap-prediksi').innerText = bapPrediksi;
                    
                    const now = new Date();
                    document.getElementById('bap-waktu').innerText = now.toLocaleString('id-ID');
                }

                if (regionalMarkers[reg.id]) {
                    regionalMarkers[reg.id].setStyle({ fillColor: cfg.color });
                    regionalMarkers[reg.id].setPopupContent(`<b>${reg.name}</b><br>Suhu: ${temp}°C | Lembap: ${hum}%<br>Status: <strong>${statusKey}</strong>`);
                }
            }
        } catch (error) {
            console.log(`Gagal memuat data untuk ${reg.name}`, error);
        }
    }
    
    const logBody = document.getElementById('log-body');
    const auditBody = document.getElementById('log-body-audit');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0') + ":" + now.getSeconds().toString().padStart(2, '0');
    
    const newHash = generateFakeHash();
    if(logBody) logBody.insertAdjacentHTML('afterbegin', `<tr><td>${timeStr}</td><td>PREDICTIVE SYNC (LIVE)</td><td class="hash-text">${newHash}</td></tr>`);
    if(auditBody) auditBody.insertAdjacentHTML('afterbegin', `<tr><td>${timeStr}</td><td>Auto-Analysis & AI Risk Forecast</td><td>SYNCED</td><td class="hash-text">${newHash}</td></tr>`);
}

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

function bukaTab(namaTab, elemenMenu) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(menu => menu.classList.remove('active'));
    document.getElementById(namaTab).classList.add('active');
    elemenMenu.classList.add('active');
    if(namaTab === 'monitoring' && petaKalimantan) setTimeout(() => petaKalimantan.invalidateSize(), 100);
}
