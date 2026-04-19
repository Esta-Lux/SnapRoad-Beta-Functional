-- Optional battery % for Life360-style friend status (client-reported).
-- Run in Supabase SQL Editor after live_locations exists.

ALTER TABLE public.live_locations
  ADD COLUMN IF NOT EXISTS battery_pct SMALLINT;

COMMENT ON COLUMN public.live_locations.battery_pct IS 'Last reported device battery 0-100; null if unknown.';
