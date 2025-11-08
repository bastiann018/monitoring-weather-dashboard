<?php
// api/stations.php
require __DIR__ . '/_db.php';
$stmt = $pdo->query("SELECT id, name, latitude, longitude, description FROM stations ORDER BY name");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));