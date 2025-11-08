const API_BASE = '../api';
const fmt = (x, suf='') => (x==null || x==='') ? '--' : (Number(x).toFixed(2)+suf);

// ====== FALLBACK STATIONS (pakai kalau API stations.php kosong/gagal) ======
const DEFAULT_STATIONS = [
  { id:'balige',   name:'Balige',   latitude: 2.334000, longitude: 99.060000, description:'Stasiun Balige' },
  { id:'laguboti', name:'Laguboti', latitude: 2.377000, longitude: 99.133000, description:'Stasiun Laguboti' },
  { id:'silaen',   name:'Silaen',   latitude: 2.457000, longitude: 99.300000, description:'Stasiun Silaen' },
  { id:'porsea',   name:'Porsea',   latitude: 2.452000, longitude: 99.190000, description:'Stasiun Porsea' }
];

let tempChart, humChart;
let currentStation = 'balige'; // default UI

// ========= CHARTS =========
function initCharts() {
  const tl = document.getElementById('tempChart').getContext('2d');
  tempChart = new Chart(tl, {
    type: 'line',
    data: { labels: [], datasets: [{ label: '°C', data: [], tension:.3, pointRadius:3 }]},
    options: { responsive:true, scales:{ y:{ beginAtZero:false } } }
  });
  const hl = document.getElementById('humChart').getContext('2d');
  humChart = new Chart(hl, {
    type: 'line',
    data: { labels: [], datasets: [{ label: '%', data: [], tension:.3, pointRadius:3 }]},
    options: { responsive:true, scales:{ y:{ suggestedMin:0, suggestedMax:100 } } }
  });
}

// ========= MAP GLOBAL STATE =========
let map;
let markers = {};        // { station_id: LeafletMarker }
let stationsCache = [];  // array objek stasiun (dari DB / fallback)

// custom icon bawaan Leaflet (biru)
const iconBlue = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41]
});

// ========= INIT MAP =========
async function initMap(){
  // 1. buat map kosong dulu
  map = L.map('map').setView([2.34, 99.12], 10);

  // 2. pasang tile
  let tile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  });
  tile.on('tileerror', () => {
    // fallback (kalau OSM tile gagal dimuat)
    L.tileLayer('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap & CARTO'
    }).addTo(map);
  });
  tile.addTo(map);

  // 3. ambil daftar stasiun dari API
  try{
    const res = await fetch(`${API_BASE}/stations.php`);
    if(!res.ok) throw new Error('stations.php HTTP '+res.status);
    const data = await res.json();
    stationsCache = Array.isArray(data) && data.length ? data : DEFAULT_STATIONS;
    if(!data || data.length === 0){
      document.getElementById('mapStatus').textContent = 'Catatan: tabel stations kosong → pakai koordinat default.';
    }
  }catch(e){
    stationsCache = DEFAULT_STATIONS;
    document.getElementById('mapStatus').textContent = 'Tidak bisa memuat daftar stasiun (pakai koordinat default).';
    console.warn('[Map] stations fallback:', e);
  }

  // 4. buat marker untuk semua stasiun
  stationsCache.forEach(s => {
    const m = L.marker([s.latitude, s.longitude], {icon: iconBlue}).addTo(map);
    m.bindPopup(
      `<b>${s.name}</b><br>`+
      `${Number(s.latitude).toFixed(6)}, ${Number(s.longitude).toFixed(6)}<br>`+
      `<span id="pp-${s.id}">memuat...</span>`
    );
    markers[s.id] = m;
  });

  // 5. fitBounds (zoom ke semua dulu)
  const group = L.featureGroup(Object.values(markers));
  if(group.getLayers().length){
    map.fitBounds(group.getBounds().pad(0.15));
  }

  // 6. isi popup dengan data realtime terbaru
  await refreshLatestAll();

  // 7. fokus awal ke currentStation
  focusStation(currentStation, {openPopup:true, updateStatic:true});
}

// ========= FOKUS KE SATU STASIUN =========
// behavior:
// - map akan pindah ke lat/lon stasiun tersebut
// - zoom di-set ke 13 (biar agak dekat ke kota tersebut)
// - popup stasiun dibuka
// - static map (gambar kanan) juga diganti
function focusStation(stationId, opts={}){
  const st = stationsCache.find(s=>s.id===stationId);
  if(!st) return; // kalau tidak ketemu, diam aja

  // 1. pindahkan dan zoom peta
  const latLng = [ st.latitude, st.longitude ];
  map.setView(latLng, 13);

  // 2. buka popup marker, kalau mau
  if(opts.openPopup && markers[stationId]){
    markers[stationId].openPopup();
  }

  // 3. update gambar peta statis di dashboard kanan, kalau diminta
  if(opts.updateStatic){
    updateStaticMap(st.latitude, st.longitude);
  }
}

// ========= GAMBAR PETA STATIS (KANAN) =========
// urutan fallback:
//   OSM StaticMap  -> Wikimedia StaticMap -> SVG placeholder
function updateStaticMap(lat, lon){
  const img = document.getElementById('staticMap');

  // 1) OSM StaticMap: center, zoom 12, marker ringan
  const osmUrl  = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=12&size=600x360&markers=${lat},${lon},lightblue1`;

  // 2) Wikimedia (pakai urutan long,lat di URL img service mereka)
  const wikiUrl = `https://maps.wikimedia.org/img/osm-intl,12,${lon},${lat},600x360.png?lang=en`;

  img.onerror = () => {
    console.warn('[StaticMap] OSM gagal → coba Wikimedia');
    img.onerror = () => {
      console.warn('[StaticMap] Wikimedia gagal → pakai SVG placeholder');
      const svg = encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360'>
           <rect width='100%' height='100%' fill='#eef2f7'/>
           <text x='50%' y='48%' font-family='Inter,Arial' font-size='16' text-anchor='middle' fill='#6b7280'>
             Tidak bisa memuat peta (offline)
           </text>
           <circle cx='300' cy='200' r='8' fill='#3b82f6'/>
           <text x='50%' y='68%' font-family='Inter,Arial' font-size='14' text-anchor='middle' fill='#374151'>
             ${lat.toFixed(6)}, ${lon.toFixed(6)}
           </text>
         </svg>`
      );
      img.src = `data:image/svg+xml,${svg}`;
    };
    img.src = wikiUrl;
  };

  img.src = osmUrl;
  img.alt = `Static Map: ${lat},${lon}`;
}

// ========= REFRESH POPUP DATA (UNTUK SEMUA MARKER) =========
async function refreshLatestAll(){
  try{
    const r = await fetch(`${API_BASE}/latest_all.php`);
    if(!r.ok) return;
    const rows = await r.json();
    rows.forEach(d=>{
      const box = document.getElementById(`pp-${d.station_id}`);
      if(box){
        box.innerHTML = `
          🌡️ ${fmt(d.temperature_c,'°C')}
          • 💧 ${fmt(d.humidity_pct,'%')}<br>
          🌬️ ${fmt(d.wind_speed_ms,' m/s')}
          • 🌧️ ${fmt(d.rainfall_mm,' mm')}
          • 🔆 ${fmt(d.light_lux,' lux')}<br>
          🕒 ${d.ts}
        `;
      }
    });
  }catch(e){
    console.warn('[Map] refreshLatestAll fail', e);
  }
}

// ========= KPI + HISTORY (bagian lain dashboard) =========
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

  // ambil history buat hitung min/max juga
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
  tempChart.data.labels = asc.map(x=>x.ts);
  tempChart.data.datasets[0].data = asc.map(x=>x.temperature_c);
  tempChart.update();

  humChart.data.labels = asc.map(x=>x.ts);
  humChart.data.datasets[0].data = asc.map(x=>x.humidity_pct);
  humChart.update();
}

// ini dipanggil berkala biar KPI, tabel, popup marker selalu up to date
async function refresh(){
  await Promise.all([
    loadLatest(currentStation),
    loadHistory(currentStation),
    refreshLatestAll()
  ]);
}

// ========= DROPDOWN GANTI STASIUN =========
function initStationSelector(){
  const sel = document.getElementById('stationSelect');
  if(!sel) return;

  sel.value = currentStation;

  sel.addEventListener('change', async (e)=>{
    currentStation = e.target.value;

    // 1. fokus map ke stasiun yg dipilih
    focusStation(currentStation, {openPopup:true, updateStatic:true});

    // 2. refresh KPI/grafik/tabel
    await refresh();
  });
}

// ========= BOOTSTRAP SEMUA =========
initCharts();
initMap().then(()=>{
  initStationSelector();
  refresh();
  setInterval(refresh, 5000);
});
