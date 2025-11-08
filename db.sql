CREATE DATABASE IF NOT EXISTS weather CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE weather;

CREATE TABLE IF NOT EXISTS readings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  station_id VARCHAR(32) NOT NULL,
  ts DATETIME NOT NULL,
  temperature_c DECIMAL(5,2) NULL,
  humidity_pct DECIMAL(5,2) NULL,
  wind_speed_ms DECIMAL(6,2) NULL,
  rainfall_mm DECIMAL(6,2) NULL,
  light_lux DECIMAL(10,2) NULL,
  raw_json JSON NULL,
  INDEX idx_ts (ts),
  INDEX idx_station_ts (station_id, ts)
);

CREATE TABLE IF NOT EXISTS stations (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  description VARCHAR(255) NULL
);

REPLACE INTO stations (id, name, latitude, longitude, description) VALUES
('balige',   'Balige',   2.334000, 99.060000, 'Stasiun Balige'),
('laguboti', 'Laguboti', 2.377000, 99.133000, 'Stasiun Laguboti'),
('silaen',   'Silaen',   2.457000, 99.300000, 'Stasiun Silaen'),
('porsea',   'Porsea',   2.452000, 99.190000, 'Stasiun Porsea');