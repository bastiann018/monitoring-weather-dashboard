<?php
// C:\xampp\htdocs\Project_TA\monitoring-weather-dashboard\public\index.php

// Pastikan tidak ada karakter atau spasi sebelum tag ini.
require __DIR__ . '/../api/_db.php'; 

// Ambil data stasiun dari database
$stmt_stasiun = $pdo->query("SELECT id, name FROM stations ORDER BY name");
$stations_data = $stmt_stasiun->fetchAll(PDO::FETCH_ASSOC);

// Tentukan stasiun awal (default)
$default_station = $stations_data[0]['id'] ?? 'balige';

// Set timezone untuk date()
$cfg = require __DIR__ . '/../config.php';
date_default_timezone_set($cfg['timezone']);
?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Dashboard Cuaca Toba</title>

    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/styles.css">

    <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossorigin="anonymous"
    />

    <style>
        /* ==== Tambahan debug style ==== */
        #map{
            height:400px;
            border-radius:12px;
            background:#eef2f7;      
            border:1px solid #d0d5dd;
            position:relative;
            overflow:hidden;
        }
        #staticMap{
            width:100%;
            min-height:180px;
            border-radius:12px;
            border:1px solid #d0d5dd;
            background:#eef2f7;
            object-fit:cover;
            display:block;
        }
        /* area status/debug supaya kamu lihat error langsung */
        .debug-box{
            font-size:12px;
            line-height:1.4;
            color:#b91c1c;
            background:#fff1f2;
            border:1px solid #fecaca;
            border-radius:6px;
            padding:8px 10px;
            margin-top:8px;
            font-family:ui-monospace, SFMono-Regular, Consolas, monospace;
            white-space:pre-line;
        }
        .debug-box.ok{
            color:#065f46;
            background:#ecfdf5;
            border-color:#6ee7b7;
        }
    </style>
</head>
<body>
<div class="app">
    <aside class="sidebar">
        <div class="brand">🌤️ <span>Stasiun Cuaca Toba</span></div>
        <nav class="nav">
            <a class="active" href="#">Dashboard</a> 
            <a href="#history">History</a> 
            <a href="#about">About</a>
        </nav>
    </aside>

    <main class="content">
        <h2 class="page-title">Dashboard Cuaca</h2>
        <div class="muted"><?= date('l, d F Y \p\u\k\u\l H:i'); ?></div> 

        <section class="grid mt">
            <div class="card span-6">
                <h3 class="title">🗺️ Peta Stasiun (Interaktif)</h3>
                <div id="map"></div>
                <div id="mapStatus" class="debug-box" style="display:none"></div>
            </div>

            <div class="card span-6">
                <h3 class="title">📍 Pilih Stasiun</h3>
                <select id="stationSelect" class="select">
                    <?php foreach ($stations_data as $station): ?>
                        <option value="<?= $station['id'] ?>" <?= $station['id'] === $default_station ? 'selected' : '' ?>>
                            <?= $station['name'] ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <div class="muted" style="margin-top:8px">
                    KPI, grafik, tabel, dan gambar peta menyesuaikan stasiun terpilih.
                </div>

                <h3 class="title" style="margin-top:16px">🖼️ Gambar Peta (Static)</h3>
                <img id="staticMap" alt="Static Map lokasi stasiun" src="">
                <div id="staticStatus" class="debug-box" style="display:none"></div>
            </div>
        </section>

        <section class="grid mt">
            <div class="card span-3">
                <div class="kpi">
                    <div>
                        <div class="label">Temperature</div>
                        <div class="value" id="kpi-temp">--°C</div>
                        <div class="muted">Min: <span id="kpi-tmin">--</span> • Max: <span id="kpi-tmax">--</span></div>
                    </div><div>🌡️</div>
                </div>
            </div>

            <div class="card span-3"><div class="kpi"><div><div class="label">Humidity</div><div class="value" id="kpi-rh">--%</div></div><div>💧</div></div></div>

            <div class="card span-2"><div class="kpi"><div><div class="label">Rainfall</div><div class="value" id="kpi-rain">-- mm</div></div><div>🌧️</div></div></div>

            <div class="card span-2"><div class="kpi"><div><div class="label">Wind Speed</div><div class="value" id="kpi-wind">-- m/s</div></div><div>🌬️</div></div></div>

            <div class="card span-2"><div class="kpi"><div><div class="label">Light</div><div class="value" id="kpi-light">-- lux</div></div><div>🔆</div></div></div>
        </section>

        <section class="card mt">
            <h3 class="title">Cuaca Saat Ini</h3>
            <div class="muted">
                Angin <span id="now-wind">--</span> •
                Kelembapan <span id="now-rh">--</span> •
                Waktu <span id="now-time">--</span>
            </div>
        </section>

        <section class="grid mt">
            <div class="card span-6">
                <h3 class="title">🌡️ Temperature Trend</h3>
                <canvas id="tempChart" height="120"></canvas>
            </div>
            <div class="card span-6">
                <h3 class="title">💧 Humidity Trend</h3>
                <canvas id="humChart" height="120"></canvas>
            </div>
        </section>

        <a id="history"></a> 
        <section class="card mt">
            
            <div class="table-header">
                <h3 class="title">📒 Weather Data History</h3>
                
                <div class="action-buttons">
                    <a href="#" class="btn btn-excel">
                        <span style="font-size:1.2em;">📄</span> Export to Excel 
                    </a>
                    <a href="#" class="btn btn-pdf">
                        <span style="font-size:1.2em;">🖨️</span> Export to PDF
                    </a>
                </div>
            </div>
            
            <table id="tblHistory">
                <thead>
                    <tr>
                        <th>Date</th><th>Temperature</th><th>Humidity</th>
                        <th>Rainfall</th><th>Wind</th><th>Light</th>
                    </tr>
                </thead>
                <tbody>
                    </tbody>
            </table>
            
            <div class="table-footer-controls">
                <div class="pagination-info">
                    Showing 1 to 50 of <span id="total-entries">--</span> entries
                </div>
                
                <div class="pagination-buttons">
                    <button class="btn btn-pdf" disabled>Previous</button>
                    <button class="btn btn-pdf">Next</button>
                </div>
            </div>
        </section>
        <a id="about"></a>
        <section class="card mt">
            <h3 class="title">ℹ️ Tentang Sistem</h3>
            <p>Stasiun cuaca multi-lokasi (Balige, Laguboti, Silaen, Porsea) dengan sensor DHT22, BH1750, rain gauge, anemometer; data via LoRa/MQTT; panel surya + baterai.</p>
        </section>
    </main>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

<script 
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    ></script>

<script>
    var API_BASE='../api'; 
    let currentStation = '<?= $default_station ?>'; 
</script>
<script src="assets/js/app_debug.js"></script>
</body>
</html>