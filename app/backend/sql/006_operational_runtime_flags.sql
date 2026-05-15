-- Optional: seed operational kill-switch keys (all enabled = normal operations).
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

INSERT INTO public.app_config (key, value, updated_at) VALUES
  ('driver_signups_enabled', 'true'::jsonb, NOW()),
  ('partner_signups_enabled', 'true'::jsonb, NOW()),
  ('premium_purchases_enabled', 'false'::jsonb, NOW()),
  ('partner_payments_enabled', 'true'::jsonb, NOW()),
  ('offer_redemptions_enabled', 'true'::jsonb, NOW()),
  ('partner_qr_redemption_enabled', 'true'::jsonb, NOW()),
  ('incident_submissions_enabled', 'true'::jsonb, NOW()),
  ('incident_voting_enabled', 'true'::jsonb, NOW()),
  ('partner_referrals_enabled', 'true'::jsonb, NOW()),
  ('push_notifications_enabled', 'true'::jsonb, NOW()),
  ('live_location_publishing_enabled', 'true'::jsonb, NOW()),
  ('telemetry_collection_enabled', 'true'::jsonb, NOW()),
  ('ai_photo_moderation_enabled', 'true'::jsonb, NOW()),
  ('gems_rewards_enabled', 'true'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
