-- =============================================================================
-- RowTech Initial Schema Migration
-- Run via: supabase db push  OR  supabase migration up
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Devices (sensor MAC registry)
-- Auto-registered by hub when unknown MACs appear on /api/telemetry
-- ---------------------------------------------------------------------------
create table devices (
  id               uuid        primary key default gen_random_uuid(),
  mac_address      text        unique not null,
  name             text,
  last_seen        timestamptz,
  battery_level    int,         -- Percentage 0–100 (derived from voltage)
  firmware_version text,
  created_at       timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Rower profiles
-- ---------------------------------------------------------------------------
create table profiles (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  photo_url  text,
  side       text check (side in ('port', 'starboard')),
  height_cm  int,
  weight_kg  int,
  notes      text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Boats
-- ---------------------------------------------------------------------------
create table boats (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Boat seat assignments
-- Maps seat number 1–8 to a rower profile and sensor device
-- ---------------------------------------------------------------------------
create table boat_seats (
  id          uuid primary key default gen_random_uuid(),
  boat_id     uuid references boats(id)    on delete cascade,
  seat_number int  check (seat_number between 1 and 8),
  profile_id  uuid references profiles(id) on delete set null,
  device_mac  text references devices(mac_address) on delete set null,
  unique(boat_id, seat_number)
);

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
create table sessions (
  id         uuid        primary key default gen_random_uuid(),
  boat_id    uuid        references boats(id) on delete set null,
  started_at timestamptz not null,
  ended_at   timestamptz,
  duration   int,        -- Duration in seconds
  avg_rate   float,      -- Average stroke rate (SPM) across session
  notes      text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Strokes
-- One row per completed stroke per sensor. Written by /api/strokes.
-- ---------------------------------------------------------------------------
create table strokes (
  id                  uuid    primary key default gen_random_uuid(),
  session_id          uuid    references sessions(id)  on delete cascade,
  device_mac          text,
  seat_number         int,
  profile_id          uuid    references profiles(id)  on delete set null,
  timestamp           bigint  not null,   -- millis() from sensor
  phase               int,
  feather_angle       float,
  feather_consistency float,
  rush_score          float,
  catch_sharpness     int,
  stroke_rate         float,
  roll                float,
  pitch               float
);

-- ---------------------------------------------------------------------------
-- Live telemetry (short retention, Realtime enabled)
-- Upserted by /api/telemetry — one row per active device (not append-only).
-- Delete rows older than 1 hour via pg_cron or Supabase scheduled function.
-- ---------------------------------------------------------------------------
create table telemetry (
  id              uuid        primary key default gen_random_uuid(),
  device_mac      text        unique not null,  -- One live row per device
  seat_number     int,
  session_id      uuid        references sessions(id) on delete cascade,
  timestamp       bigint      not null,
  phase           int,
  roll            float,
  feather_angle   float,
  rush_score      float,
  stroke_rate     float,
  catch_sharpness int,
  battery_level   float,
  inserted_at     timestamptz default now()
);

-- Enable Supabase Realtime on telemetry for live dashboard subscriptions
alter publication supabase_realtime add table telemetry;

-- ---------------------------------------------------------------------------
-- Indexes for query performance
-- ---------------------------------------------------------------------------
create index on strokes(session_id);
create index on strokes(device_mac);
create index on strokes(profile_id);
create index on strokes(timestamp);
create index on telemetry(device_mac);
create index on telemetry(session_id);
create index on boat_seats(boat_id);
create index on boat_seats(profile_id);
create index on sessions(started_at desc);
create index on sessions(boat_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table devices     enable row level security;
alter table profiles    enable row level security;
alter table boats       enable row level security;
alter table boat_seats  enable row level security;
alter table sessions    enable row level security;
alter table strokes     enable row level security;
alter table telemetry   enable row level security;

-- Authenticated users (coaches / admins via dashboard) have full access
create policy "authenticated full access" on devices
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on profiles
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on boats
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on boat_seats
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on sessions
  for all using (auth.role() = 'authenticated');

create policy "authenticated full access" on strokes
  for all using (auth.role() = 'authenticated');

-- Hub writes to telemetry via service role key (bypasses RLS)
-- Dashboard reads telemetry via authenticated user
create policy "service role telemetry insert" on telemetry
  for insert with check (true);

create policy "authenticated telemetry read" on telemetry
  for select using (auth.role() = 'authenticated');

-- Allow service role to update/upsert telemetry
create policy "service role telemetry upsert" on telemetry
  for update using (true);
