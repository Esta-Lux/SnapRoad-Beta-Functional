-- Trip-based odometer + partial-tank MPG rules for fuel tracker
ALTER TABLE public.fuel_history
  ADD COLUMN IF NOT EXISTS is_full_tank BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.fuel_history
  ADD COLUMN IF NOT EXISTS odometer_source TEXT;

ALTER TABLE public.fuel_history
  ADD COLUMN IF NOT EXISTS trips_miles_used DOUBLE PRECISION;

COMMENT ON COLUMN public.fuel_history.is_full_tank IS 'When false, interval MPG vs prior fill is skipped (partial top-off).';
COMMENT ON COLUMN public.fuel_history.odometer_source IS 'manual | auto_trips — how odometer was set for this fill.';
COMMENT ON COLUMN public.fuel_history.trips_miles_used IS 'SnapRoad trip miles summed since prior fill at log time (audit / missed-trip hint).';
