USE weather;

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

CREATE INDEX IF NOT EXISTS idx_station_ts ON readings(station_id, ts);
