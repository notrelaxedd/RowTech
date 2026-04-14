-- Add seat_count to boats table
-- Allows each boat to have between 1 and 8 seats configured.

alter table boats
  add column if not exists seat_count int not null default 8
    check (seat_count between 1 and 8);

-- Required for Supabase Realtime UPDATE events to include full row data.
-- The telemetry table uses upsert (one row per device), so every hub POST
-- is an UPDATE after the first insert. Without REPLICA IDENTITY FULL,
-- payload.new is empty and the dashboard never receives the data.
alter table telemetry replica identity full;
