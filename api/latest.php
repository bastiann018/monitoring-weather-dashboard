<?php
// api/latest.php
require __DIR__ . '/_db.php';
$station = $_GET['station'] ?? 'balige';
$stmt = $pdo->prepare("SELECT * FROM readings WHERE station_id=? ORDER BY ts DESC LIMIT 1");
$stmt->execute([$station]);
echo json_encode($stmt->fetch(PDO::FETCH_ASSOC) ?: []);