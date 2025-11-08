<?php
// api/latest_all.php
require __DIR__ . '/_db.php';
$sql = "
SELECT r.*
FROM readings r
JOIN (
    SELECT station_id, MAX(ts) AS mx
    FROM readings
    GROUP BY station_id
) t ON t.station_id = r.station_id AND t.mx = r.ts
";
echo json_encode($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC));