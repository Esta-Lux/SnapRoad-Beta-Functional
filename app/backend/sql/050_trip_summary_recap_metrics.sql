-- Keep the post-trip summary card and Insights & Recap history on the same row shape.
-- These are idempotent so environments that missed earlier trip metric migrations can catch up cleanly.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS destination TEXT,
  ADD COLUMN IF NOT EXISTS avg_speed_mph DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS max_speed_mph DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS fuel_used_gallons DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS fuel_cost_estimate DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS mileage_value_estimate DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hard_braking_events INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speeding_events INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incidents_reported INT DEFAULT 0;

COMMENT ON COLUMN public.trips.fuel_cost_estimate IS
  'Estimated trip fuel cost captured from the mobile trip summary.';
COMMENT ON COLUMN public.trips.mileage_value_estimate IS
  'Estimated IRS mileage value captured from the mobile trip summary.';
