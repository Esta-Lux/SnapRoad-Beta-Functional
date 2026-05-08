-- Track hard acceleration as a first-class trip safety signal.
-- Used by trip summary, Insights & Recap, and Orion coaching.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS hard_acceleration_events INT DEFAULT 0;

COMMENT ON COLUMN public.trips.hard_acceleration_events IS
  'Count of high positive acceleration events detected during the completed trip.';
