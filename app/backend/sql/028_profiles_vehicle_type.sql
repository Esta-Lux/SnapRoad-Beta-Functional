-- Vehicle class for routing/analytics UI (car vs motorcycle)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IS NULL OR vehicle_type IN ('car', 'motorcycle'));

COMMENT ON COLUMN public.profiles.vehicle_type IS 'Primary vehicle class: car (default) or motorcycle';
