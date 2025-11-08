// public/assets/js/app_debug.js
// API_BASE dan currentStation sekarang dideklarasikan di index.php
// sehingga tidak perlu dideklarasikan ulang di sini.

// ==== util basic ====
const fmt = (x, suf='') => (x==null || x==='') ? '--' : (Number(x).toFixed(2)+suf);

// helper tampilkan debug box
function showDebug(id, msg, ok=false){
  const box = document.getElementById(id);
  if(!box) return;
  box.style.display = 'block';
  box.className = 'debug-box' + (ok?' ok':'');
  box.textContent = msg;
}

// --- DEBUG STARTUP ---
console.log('[app_debug.js] script loaded');
showDebug('mapStatus', 'JS loaded, init starting…', true);

// ====== fallback station data ======
const DEFAULT_STATIONS = [
  { id:'balige',   name:'Balige',   latitude: 2.334000, longitude: 99.060000, description:'Stasiun Balige' },
  { id:'laguboti', name:'Laguboti', latitude: 2.377000, longitude: 99.133000, description:'Stasiun Laguboti' },
  { id:'silaen',   name:'Silaen',   latitude: 2.457000, longitude: 99.300000, description:'Stasiun Silaen' },
  { id:'porsea',   name:'Porsea',   latitude: 2.452000, longitude: 99.190000, description:'Stasiun Porsea' }
];

// currentStation (dideklarasikan di index.php)
let map;
let markers = {};
let stationsCache = [];

let tempChart, humChart;

// ========== 1. Init Charts ==========
function initCharts() {
  const tCanvas = document.getElementById('tempChart');
  const hCanvas = document.getElementById('humChart');

  if (!tCanvas || !hCanvas) {
    showDebug('mapStatus', 'Canvas chart tidak ditemukan di DOM', false);
    return;
  }

  const tctx = tCanvas.getContext('2d');
  const hctx = hCanvas.getContext('2d');

  tempChart = new Chart(tctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: '°C', data: [], tension:.3, pointRadius:3 }]},
    options: { responsive:true, scales:{ y:{ beginAtZero:false } } }
  });

  humChart = new Chart(hctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: '%', data: [], tension:.3, pointRadius:3 }]},
    options: { responsive:true, scales:{ y:{ suggestedMin:0, suggestedMax:100 } } }
  });
}

// ========== 2. Static map preview (Menggunakan Fallback SVG) ==========
function updateStaticMap(lat, lon){
  const img = document.getElementById('staticMap');
  const statusBoxId = 'staticStatus';

  if(!img){
    showDebug(statusBoxId, 'IMG staticMap tidak ada di DOM', false);
    return;
  }

  // >> PERBAIKAN: Menghilangkan semua panggilan API eksternal yang bermasalah.
  // Langsung menggunakan SVG Placeholder yang dijamin akan tampil.

  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360'>
        <rect width='100%' height='100%' fill='#eef2f7'/>
        <text x='50%' y='48%' font-family='Inter,Arial' font-size='16' text-anchor='middle' fill='#6b7280'>
          Static Map (Simulasi Lokasi)
        </text>
        <circle cx='300' cy='200' r='8' fill='#3b82f6'/>
        <text x='50%' y='68%' font-family='Inter,Arial' font-size='14' text-anchor='middle' fill='#374151'>
          ${lat.toFixed(6)}, ${lon.toFixed(6)}
        </text>
        <text x='50%' y='85%' font-family='Inter,Arial' font-size='12' text-anchor='middle' fill='#1e40af'>
          Map Eksternal diblokir jaringan / bermasalah.
        </text>
      </svg>`
  );
  
  // Langsung set sumber gambar ke SVG Data URI
  img.src = `data:image/svg+xml,${svg}`;
  img.alt = `Static Map: ${lat},${lon}`;
  
  // Karena ini adalah fallback internal yang sukses, kita set status OK
  showDebug(statusBoxId, 'StaticMap berhasil dimuat ✅ (Menggunakan Fallback SVG)', true);
}

// ========== 3. Leaflet map ==========
async function initMap(){
  // cek apakah Leaflet ada
  if(typeof L === 'undefined'){
    showDebug('mapStatus', 'Leaflet L undefined → Leaflet JS gagal load / diblokir.\nCek koneksi ke https://unpkg.com', false);
    return;
  }

  const mapDiv = document.getElementById('map');
  if(!mapDiv){
    showDebug('mapStatus', 'DIV #map tidak ditemukan di DOM', false);
    return;
  }

  map = L.map('map').setView([2.34, 99.12], 10);

  const osmTile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  });

  let fallbackUsed = false;
  osmTile.on('tileerror', () => {
    if (fallbackUsed) return;
    fallbackUsed = true;
    showDebug('mapStatus', 'Tile OSM gagal → fallback Carto', false);
    // Ini adalah fallback untuk map tiles interaktif
    L.tileLayer('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap & CARTO'
    }).addTo(map);
  });

  osmTile.addTo(map);

  // ambil daftar stasiun
  try{
    const res = await fetch(`${API_BASE}/stations.php`);
    if(!res.ok){
      showDebug('mapStatus', `stations.php HTTP ${res.status} → pakai DEFAULT_STATIONS`, false);
      throw new Error('bad http');
    }
    const data = await res.json();
    if(!Array.isArray(data) || data.length === 0){
      stationsCache = DEFAULT_STATIONS;
      showDebug('mapStatus', 'stations.php kosong → pakai DEFAULT_STATIONS', false);
    } else {
      stationsCache = data;
      showDebug('mapStatus', 'stations.php OK ✅', true);
    }
  }catch(err){
    stationsCache = DEFAULT_STATIONS;
    console.warn(err);
    showDebug('mapStatus', 'Gagal fetch stations.php → pakai DEFAULT_STATIONS', false);
  }

  // buat marker per stasiun
  markers = {};
  stationsCache.forEach(s => {
    // PERBAIKAN: Konversi string dari DB menjadi Number untuk menghilangkan TypeError
    s.latitude = Number(s.latitude);
    s.longitude = Number(s.longitude);
    
    const m = L.marker([s.latitude, s.longitude]).addTo(map);
    m.bindPopup(
      `<b>${s.name}</b><br>`+
      `${s.latitude.toFixed(6)}, ${s.longitude.toFixed(6)}<br>`+ 
      `<span id="pp-${s.id}">memuat...</span>`
    );
    markers[s.id] = m;
  });

  // zoom agar semua titik kelihatan
  const allLayers = Object.values(markers);
  if(allLayers.length){
    const group = L.featureGroup(allLayers);
    map.fitBounds(group.getBounds().pad(0.15));
  }

  // isi popup data sensor terbaru
  await refreshLatestAll();

  // fokus awal ke currentStation
  focusStation(currentStation, {openPopup:true, updateStatic:true});
}

// pindah fokus map + update static map
function focusStation(stationId, opts={}){
  const st = stationsCache.find(s=>s.id===stationId);
  if(!st){
    showDebug('mapStatus', `focusStation: ${stationId} tidak ditemukan`, false);
    return;
  }

  if(map){
    map.setView([st.latitude, st.longitude], 13);
    if(opts.openPopup && markers[stationId]){
      markers[stationId].openPopup();
    }
  }

  if(opts.updateStatic){
    updateStaticMap(st.latitude, st.longitude);
  }

  showDebug(
    'mapStatus',
    `Fokus pada ${st.name} (${st.latitude.toFixed(5)}, ${st.longitude.toFixed(5)})`,
    true
  );
}

// ========== 4. data popup multi stasiun ==========
async function refreshLatestAll(){
  try{
    const r = await fetch(`${API_BASE}/latest_all.php`);
    if(!r.ok){
      console.warn('latest_all.php HTTP', r.status);
      return;
    }
    const rows = await r.json();
    rows.forEach(d=>{
      const box = document.getElementById(`pp-${d.station_id}`);
      if(box){
        box.innerHTML = `
          🌡️ ${fmt(d.temperature_c,'°C')} • 💧 ${fmt(d.humidity_pct,'%')}<br>
          🌬️ ${fmt(d.wind_speed_ms,' m/s')} • 🌧️ ${fmt(d.rainfall_mm,' mm')} • 🔆 ${fmt(d.light_lux,' lux')}<br>
          🕒 ${d.ts}
        `;
      }
    });
  }catch(e){
    console.warn('refreshLatestAll fail', e);
  }
}

// ========== 5. KPI + tabel + chart ==========
async function loadLatest(station){
  const r = await fetch(`${API_BASE}/latest.php?station=${station}`);
  const d = await r.json().catch(()=>({}));

  if(!d || !d.ts){
    document.getElementById('kpi-temp').textContent='--°C';
    document.getElementById('kpi-rh').textContent='--%';
    document.getElementById('kpi-wind').textContent='-- m/s';
    document.getElementById('kpi-rain').textContent='-- mm';
    document.getElementById('kpi-light').textContent='-- lux';

    document.getElementById('now-wind').textContent='-- m/s';
    document.getElementById('now-rh').textContent='--%';
    document.getElementById('now-time').textContent='--';

    document.getElementById('kpi-tmin').textContent='--';
    document.getElementById('kpi-tmax').textContent='--';
    return;
  }

  document.getElementById('kpi-temp').textContent  = fmt(d.temperature_c,'°C');
  document.getElementById('kpi-rh').textContent    = fmt(d.humidity_pct,'%');
  document.getElementById('kpi-wind').textContent  = fmt(d.wind_speed_ms,' m/s');
  document.getElementById('kpi-rain').textContent  = fmt(d.rainfall_mm,' mm');
  document.getElementById('kpi-light').textContent = fmt(d.light_lux,' lux');

  document.getElementById('now-wind').textContent  = fmt(d.wind_speed_ms,' m/s');
  document.getElementById('now-rh').textContent    = fmt(d.humidity_pct,'%');
  document.getElementById('now-time').textContent  = d.ts;

  const h = await (await fetch(`${API_BASE}/history.php?station=${station}&limit=100`)).json().catch(()=>[]);
  const temps = (h||[]).map(x=>Number(x.temperature_c)).filter(x=>!isNaN(x));
  document.getElementById('kpi-tmin').textContent =
    temps.length? Math.min(...temps).toFixed(2):'--';
  document.getElementById('kpi-tmax').textContent =
    temps.length? Math.max(...temps).toFixed(2):'--';
}

async function loadHistory(station){
  const rows = await (await fetch(`${API_BASE}/history.php?station=${station}&limit=50`)).json().catch(()=>[]);
  const tb = document.querySelector('#tblHistory tbody');
  tb.innerHTML = '';

  (rows||[]).forEach(x=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${x.ts}</td>
      <td>${fmt(x.temperature_c,'°C')}</td>
      <td>${fmt(x.humidity_pct,'%')}</td>
      <td>${fmt(x.rainfall_mm,' mm')}</td>
      <td>${fmt(x.wind_speed_ms,' m/s')}</td>
      <td>${fmt(x.light_lux,' lux')}</td>`;
    tb.appendChild(tr);
  });

  const asc = [...(rows||[])].reverse();
  if (tempChart && humChart){
    tempChart.data.labels = asc.map(x=>x.ts);
    tempChart.data.datasets[0].data = asc.map(x=>x.temperature_c);
    tempChart.update();

    humChart.data.labels = asc.map(x=>x.ts);
    humChart.data.datasets[0].data = asc.map(x=>x.humidity_pct);
    humChart.update();
  }
}

async function refreshAll(){
  await Promise.all([
    loadLatest(currentStation),
    loadHistory(currentStation),
    refreshLatestAll()
  ]);
}

// ========== 6. Dropdown event ==========
function initStationSelector(){
  const sel = document.getElementById('stationSelect');
  if(!sel){
    showDebug('mapStatus', 'Dropdown stationSelect tidak ada di DOM', false);
    return;
  }

  // sel.value sudah diset PHP. currentStation sudah diset PHP.

  sel.addEventListener('change', async (e)=>{
    currentStation = e.target.value;
    focusStation(currentStation, {openPopup:true, updateStatic:true});
    await refreshAll();
  });
}

// ========== 7. Boot sequence ==========
initCharts();
initMap().then(()=>{
  initStationSelector();
  refreshAll();
  setInterval(refreshAll, 5000);
});