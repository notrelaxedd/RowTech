-- =============================================================================
-- RowTech Seed Data — Local Development Only
-- Run via: supabase db reset  (applies migrations + seed)
-- =============================================================================

-- Demo boat
insert into boats (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Emma 8+');

-- 8 demo rower profiles
insert into profiles (id, name, side, height_cm, weight_kg) values
  ('10000000-0000-0000-0000-000000000001', 'Alice Chen',      'port',       173, 68),
  ('10000000-0000-0000-0000-000000000002', 'Ben Okafor',      'starboard',  185, 84),
  ('10000000-0000-0000-0000-000000000003', 'Cara Murphy',     'port',       170, 62),
  ('10000000-0000-0000-0000-000000000004', 'Dan Reyes',       'starboard',  180, 80),
  ('10000000-0000-0000-0000-000000000005', 'Elena Vasquez',   'port',       168, 60),
  ('10000000-0000-0000-0000-000000000006', 'Finn Larsen',     'starboard',  188, 88),
  ('10000000-0000-0000-0000-000000000007', 'Grace Kim',       'port',       165, 58),
  ('10000000-0000-0000-0000-000000000008', 'Hugo Tremblay',   'starboard',  183, 82);

-- 8 demo devices (MAC addresses matching test ESP32 units)
insert into devices (mac_address, name, battery_level, firmware_version) values
  ('AA:BB:CC:DD:EE:01', 'Sensor-8 (Stroke)', 85, '1.0.0'),
  ('AA:BB:CC:DD:EE:02', 'Sensor-7',          90, '1.0.0'),
  ('AA:BB:CC:DD:EE:03', 'Sensor-6',          78, '1.0.0'),
  ('AA:BB:CC:DD:EE:04', 'Sensor-5',          92, '1.0.0'),
  ('AA:BB:CC:DD:EE:05', 'Sensor-4',          65, '1.0.0'),
  ('AA:BB:CC:DD:EE:06', 'Sensor-3',          88, '1.0.0'),
  ('AA:BB:CC:DD:EE:07', 'Sensor-2',          71, '1.0.0'),
  ('AA:BB:CC:DD:EE:08', 'Sensor-1 (Bow)',    95, '1.0.0');

-- Assign rowers to seats in demo boat
insert into boat_seats (boat_id, seat_number, profile_id, device_mac) values
  ('00000000-0000-0000-0000-000000000001', 8, '10000000-0000-0000-0000-000000000001', 'AA:BB:CC:DD:EE:01'),
  ('00000000-0000-0000-0000-000000000001', 7, '10000000-0000-0000-0000-000000000002', 'AA:BB:CC:DD:EE:02'),
  ('00000000-0000-0000-0000-000000000001', 6, '10000000-0000-0000-0000-000000000003', 'AA:BB:CC:DD:EE:03'),
  ('00000000-0000-0000-0000-000000000001', 5, '10000000-0000-0000-0000-000000000004', 'AA:BB:CC:DD:EE:04'),
  ('00000000-0000-0000-0000-000000000001', 4, '10000000-0000-0000-0000-000000000005', 'AA:BB:CC:DD:EE:05'),
  ('00000000-0000-0000-0000-000000000001', 3, '10000000-0000-0000-0000-000000000006', 'AA:BB:CC:DD:EE:06'),
  ('00000000-0000-0000-0000-000000000001', 2, '10000000-0000-0000-0000-000000000007', 'AA:BB:CC:DD:EE:07'),
  ('00000000-0000-0000-0000-000000000001', 1, '10000000-0000-0000-0000-000000000008', 'AA:BB:CC:DD:EE:08');
