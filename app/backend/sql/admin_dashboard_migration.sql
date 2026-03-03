-- ============================================================
-- SnapRoad Admin Dashboard Migration
-- Run this in the Supabase SQL Editor
-- Adds missing tables + columns needed by the admin portal
-- ============================================================

-- ============================================================
-- ALTER EXISTING TABLES: Add missing columns
-- ============================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_redemptions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone character varying,
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS offer_url text,
  ADD COLUMN IF NOT EXISTS is_admin_offer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_multiplier numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS boost_expiry timestamp without time zone;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS role character varying DEFAULT 'driver';

-- ============================================================
-- TRIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  distance_miles numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  safety_score integer DEFAULT 100,
  gems_earned integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  max_speed numeric,
  avg_speed numeric,
  hard_brakes integer DEFAULT 0,
  sharp_turns integer DEFAULT 0,
  phone_usage_events integer DEFAULT 0,
  status character varying DEFAULT 'completed',
  started_at timestamp without time zone DEFAULT now(),
  ended_at timestamp without time zone
);

-- ============================================================
-- INCIDENTS TABLE (content moderation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type character varying NOT NULL,
  description text,
  location character varying,
  lat numeric,
  lng numeric,
  severity character varying DEFAULT 'medium',
  confidence numeric DEFAULT 0,
  status character varying DEFAULT 'pending',
  image_url text,
  is_blurred boolean DEFAULT false,
  moderated_by character varying,
  moderated_at timestamp without time zone,
  reported_by character varying,
  created_at timestamp without time zone DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type character varying DEFAULT 'info',
  title character varying NOT NULL,
  message text,
  priority character varying DEFAULT 'low',
  status character varying DEFAULT 'unread',
  recipients character varying DEFAULT 'all_users',
  action_url text,
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now()
);

-- ============================================================
-- REFERRALS TABLE (user-to-user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referred_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referrer_email character varying,
  referred_email character varying,
  status character varying DEFAULT 'pending',
  credits_awarded numeric DEFAULT 0,
  verified_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now()
);

-- ============================================================
-- PARTNER REFERRALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  referred_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  credits_awarded numeric DEFAULT 0,
  created_at timestamp without time zone DEFAULT now()
);

-- ============================================================
-- CAMPAIGNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  name character varying NOT NULL,
  description text,
  type character varying DEFAULT 'promotion',
  budget numeric DEFAULT 0,
  start_date timestamp without time zone,
  end_date timestamp without time zone,
  status character varying DEFAULT 'draft',
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- ============================================================
-- REWARDS TABLE (admin-managed vouchers/rewards)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  type character varying DEFAULT 'voucher',
  value numeric DEFAULT 0,
  gems_cost integer DEFAULT 0,
  description text,
  claimed integer DEFAULT 0,
  total integer DEFAULT 100,
  status character varying DEFAULT 'active',
  expires_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action character varying NOT NULL,
  actor character varying NOT NULL,
  target character varying,
  ip_address character varying,
  status character varying DEFAULT 'success',
  details text,
  created_at timestamp without time zone DEFAULT now()
);

-- ============================================================
-- PLATFORM SETTINGS TABLE (key-value)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key character varying PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp without time zone DEFAULT now()
);

-- Seed default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('general', '{"platform_name": "SnapRoad", "platform_version": "2.0.1", "maintenance_mode": false, "debug_mode": false, "max_users": 50000, "default_language": "en"}'::jsonb),
  ('security', '{"jwt_expiry_hours": 24, "password_min_length": 8, "require_2fa": false, "session_timeout_minutes": 30, "max_login_attempts": 5, "ip_whitelist_enabled": false}'::jsonb),
  ('notifications', '{"email_notifications": true, "push_notifications": true, "sms_notifications": false, "marketing_emails": false, "system_alerts": true, "weekly_reports": true}'::jsonb),
  ('api', '{"rate_limit_per_minute": 100, "max_file_size_mb": 10, "enable_cors": true, "api_version": "v1", "webhook_timeout_seconds": 30}'::jsonb),
  ('features', '{"ai_moderation": true, "real_time_analytics": true, "partner_referrals": true, "boost_services": true, "premium_features": true, "beta_features": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- LEGAL DOCUMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  type character varying NOT NULL,
  status character varying DEFAULT 'active',
  version character varying DEFAULT '1.0',
  description text,
  content text,
  is_required boolean DEFAULT false,
  last_updated timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now()
);

-- Seed default legal documents
INSERT INTO public.legal_documents (name, type, status, version, description, is_required) VALUES
  ('Privacy Policy', 'privacy', 'active', '2.1', 'How we collect and use user data', true),
  ('Terms of Service', 'terms', 'active', '3.0', 'Rules and guidelines for platform usage', true),
  ('GDPR Compliance', 'compliance', 'active', '1.0', 'EU data protection compliance', true),
  ('Cookie Policy', 'privacy', 'active', '1.5', 'How we use cookies and tracking', false),
  ('Partner Agreement', 'agreement', 'active', '2.0', 'Terms for business partners', true),
  ('Data Processing Addendum', 'compliance', 'draft', '1.0', 'Data processing agreement', true),
  ('Security Policy', 'security', 'active', '1.2', 'Security measures and protocols', false),
  ('API Terms', 'terms', 'active', '1.0', 'API usage terms and conditions', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (service_role bypass for backend)
-- ============================================================
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'trips', 'incidents', 'notifications', 'referrals',
    'partner_referrals', 'campaigns', 'rewards', 'audit_log',
    'platform_settings', 'legal_documents'
  ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "service_role_all_%s" ON public.%I',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "service_role_all_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;
