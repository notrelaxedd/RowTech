-- Add seat_count to boats table
-- Allows each boat to have between 1 and 8 seats configured.

alter table boats
  add column seat_count int not null default 8
    check (seat_count between 1 and 8);
