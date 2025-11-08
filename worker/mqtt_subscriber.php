<?php
// worker/mqtt_subscriber.php
date_default_timezone_set('Asia/Jakarta');
$config = require __DIR__ . '/../config.php';
// Pastikan phpMQTT.php sudah ditaruh di folder vendor/phpmqtt/
require __DIR__ . '/../vendor/phpmqtt/phpMQTT.php';
use Bluerhinos\phpMQTT;

// DB Setup
$pdo = (function($c){
  $dsn = "mysql:host={$c['host']};dbname={$c['name']};charset={$c['charset']}";
  return new PDO($dsn, $c['user'], $c['pass'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
})($config['db']);

// MQTT Setup
$mqtt = new phpMQTT($config['mqtt']['host'], $config['mqtt']['port'], $config['mqtt']['client_id']);
if(!$mqtt->connect(true, NULL, $config['mqtt']['username'], $config['mqtt']['password'])){
  fwrite(STDERR,"MQTT connect failed\n"); exit(1);
}

// Subscribe wildcard: weather/station/<id>
$topicWildcard = 'weather/+/+';
$mqtt->subscribe([$topicWildcard => ["qos"=>0,"function"=>"proc"]], 0);
echo "Subscribed: {$topicWildcard}\n";

// Loop untuk mendengarkan pesan
while($mqtt->proc()){}
$mqtt->close();

function proc($topic, $msg){
  global $pdo;
  $d = json_decode($msg, true) ?: [];

  // station dari payload atau topik
  $station = $d['station_id'] ?? null;
  if(!$station){
    $parts = explode('/', $topic); // contoh: weather/balige/data
    // Ambil bagian kedua dari belakang (misal 'balige')
    $station = $parts[count($parts)-2] ?? null; 
  }
  if(!$station) return;

  // Waktu: gunakan waktu dari payload atau waktu sekarang jika tidak ada
  $ts = (new DateTime(($d['ts'] ?? gmdate('c'))))->format('Y-m-d H:i:s');

  $sql = "INSERT INTO readings (station_id, ts, temperature_c, humidity_pct, wind_speed_ms, rainfall_mm, light_lux, raw_json)
          VALUES (:s,:t,:tc,:rh,:ws,:rf,:lx,:raw)";
  $pdo->prepare($sql)->execute([
    ':s'=>$station, 
    ':t'=>$ts,
    ':tc'=>$d['temperature'] ?? null, 
    ':rh'=>$d['humidity'] ?? null,
    ':ws'=>$d['wind_speed'] ?? null, 
    ':rf'=>$d['rainfall'] ?? null,
    ':lx'=>$d['light'] ?? null,
    ':raw'=>json_encode($d, JSON_UNESCAPED_UNICODE)
  ]);
  echo "Data inserted for: {$station} at {$ts}\n";
}