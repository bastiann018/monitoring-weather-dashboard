<?php
// C:\xampp\htdocs\weather-dashboard\api\_db.php
$config = require __DIR__ . '/../config.php';

// Menghilangkan require_once di index.php
if (!isset($pdo)) {
    date_default_timezone_set($config['timezone']);
    $dsn = "mysql:host={$config['db']['host']};dbname={$config['db']['name']};charset={$config['db']['charset']}";
    $pdo = new PDO($dsn, $config['db']['user'], $config['db']['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
}
// Header JSON hanya perlu di file API, tidak di sini
// header('Content-Type: application/json; charset=utf-8');