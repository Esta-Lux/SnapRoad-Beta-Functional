-- Rich trip tracking fields for mobile trip summaries, profile history, and service-driver mileage logs.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS destination TEXT,
  ADD COLUMN IF NOT EXISTS avg_speed_mph DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS fuel_used_gallons DOUBLE PRECISION;

COMMENT ON COLUMN public.trips.origin IS 'User-facing trip start label from the navigation session.';
COMMENT ON COLUMN public.trips.destination IS 'User-facing trip destination label from the navigation session.';
COMMENT ON COLUMN public.trips.avg_speed_mph IS 'Average speed from completed trip distance / elapsed driving time.';
COMMENT ON COLUMN public.trips.fuel_used_gallons IS 'Estimated fuel used for the completed trip when no fill-up data is available.';
