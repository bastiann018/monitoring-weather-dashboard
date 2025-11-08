<?php
require __DIR__ . '/_db.php';
$station = $_GET['station'] ?? 'balige';
$limit   = min(500, (int)($_GET['limit'] ?? 50));
$stmt = $pdo->prepare(
  "SELECT ts, temperature_c, humidity_pct, wind_speed_ms, rainfall_mm, light_lux
   FROM readings WHERE station_id=? ORDER BY ts DESC LIMIT {$limit}"
);
$stmt->execute([$station]);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
