-- Premium commute traffic push dedupe + last observed delay (optional debugging/analytics)
ALTER TABLE public.commute_routes
  ADD COLUMN IF NOT EXISTS last_traffic_push_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_traffic_extra_sec INTEGER;

COMMENT ON COLUMN public.commute_routes.last_traffic_push_at IS 'Last Expo push sent for heavier-than-usual traffic (cron COMMUTE_TRAFFIC); cooldown between sends.';
COMMENT ON COLUMN public.commute_routes.last_traffic_extra_sec IS 'Extra drive seconds (traffic vs baseline) at last traffic push.';
