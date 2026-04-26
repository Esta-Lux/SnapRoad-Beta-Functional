-- Commute alert scan windows: how long SnapRoad watches, alert spacing, and daily caps.
ALTER TABLE public.commute_routes
  ADD COLUMN IF NOT EXISTS monitoring_duration_minutes INTEGER NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS notification_interval_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_notifications_per_window INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_push_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_window_day TEXT,
  ADD COLUMN IF NOT EXISTS pushes_sent_window INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.commute_routes.monitoring_duration_minutes IS 'Minutes after alert window start that SnapRoad scans traffic for this commute.';
COMMENT ON COLUMN public.commute_routes.notification_interval_minutes IS 'Minimum minutes between commute pushes in the same scan window.';
COMMENT ON COLUMN public.commute_routes.max_notifications_per_window IS 'Maximum commute pushes in one local-day scan window.';
