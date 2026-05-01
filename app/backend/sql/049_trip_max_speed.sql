-- Adds top-speed tracking to trips so the post-drive summary card and the
-- profile Insights dashboard can show "max speed" alongside avg speed.
-- Nullable for backfill safety; mobile sends `max_speed_mph` from
-- `useDriveNavigation` / `useNativeNavBridge` / `usePassiveDriveGems`.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS max_speed_mph DOUBLE PRECISION;

COMMENT ON COLUMN public.trips.max_speed_mph IS
  'Peak instantaneous ground speed observed during the trip (mph). Smoothed at the source so a single GPS spike cannot inflate it.';
