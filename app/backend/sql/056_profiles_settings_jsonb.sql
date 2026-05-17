-- Profile settings persisted for mobile Settings tab (notifications, driving prefs).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.notification_settings IS
  'Merged push/email/in-app prefs; keyed like mock_data.notification_settings (incl. push_notifications.commute_alerts).';
COMMENT ON COLUMN public.profiles.app_preferences IS
  'Client preferences JSON, e.g. default_driving_mode: calm | adaptive | sport.';
