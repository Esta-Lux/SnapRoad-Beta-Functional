-- Distinguish estimated route/navigation savings from concrete offer redemption savings.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS planned_distance_miles DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS planned_duration_seconds INT,
  ADD COLUMN IF NOT EXISTS planned_fuel_estimate_gallons DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS baseline_distance_miles DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS baseline_duration_seconds INT,
  ADD COLUMN IF NOT EXISTS baseline_fuel_estimate_gallons DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS route_fuel_savings_gallons DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS route_savings_dollars DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_saved_seconds INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS savings_model_version TEXT;

ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS estimated_savings_usd DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS savings_source TEXT;

COMMENT ON COLUMN public.trips.route_fuel_savings_gallons IS
  'Estimated gallons saved versus baseline route/model. Kept separate from offer redemption savings.';
COMMENT ON COLUMN public.trips.route_savings_dollars IS
  'Estimated dollar value of route fuel savings for trip recap and insights.';
COMMENT ON COLUMN public.trips.savings_model_version IS
  'Savings model used when the trip row was created, e.g. route-v1-distance-mpg.';
COMMENT ON COLUMN public.redemptions.estimated_savings_usd IS
  'Estimated or exact dollar value saved from this redeemed offer. Separate from route savings.';
COMMENT ON COLUMN public.redemptions.savings_source IS
  'How estimated_savings_usd was produced, e.g. offer_estimate_v1 or partner_exact.';
