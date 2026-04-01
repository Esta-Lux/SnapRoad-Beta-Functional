-- 018: Admin + moderation tables missing from supabase_migration + numbered feature SQL
-- Run after: supabase_migration.sql, 017_profiles_boosts_badges.sql, 014_align_schemas.sql
-- (needs public.profiles, public.partners). Does NOT recreate public.trips / public.referrals
-- (those come from supabase_migration — avoids admin_dashboard_migration conflicts).

-- ============================================================
-- INCIDENTS (sb_get_incidents / admin moderation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  severity TEXT DEFAULT 'medium',
  confidence DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'pending',
  image_url TEXT,
  is_blurred BOOLEAN DEFAULT FALSE,
  moderated_by TEXT,
  moderated_at TIMESTAMPTZ,
  reported_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS: align driver + admin (sb_get_notifications uses profile_id)
-- supabase_migration created user_id-only rows; add admin columns.
-- ============================================================
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'low';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipients TEXT DEFAULT 'all_users';

UPDATE public.notifications AS n
SET profile_id = n.user_id
FROM public.profiles AS p
WHERE n.profile_id IS NULL
  AND n.user_id IS NOT NULL
  AND p.id = n.user_id;

-- ============================================================
-- CAMPAIGNS, REWARDS, AUDIT_LOG, PLATFORM_SETTINGS, LEGAL_DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'promotion',
  budget DOUBLE PRECISION DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  revenue DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'voucher',
  value DOUBLE PRECISION DEFAULT 0,
  gems_cost INT DEFAULT 0,
  description TEXT,
  claimed INT DEFAULT 0,
  total INT DEFAULT 100,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target TEXT,
  ip_address TEXT,
  status TEXT DEFAULT 'success',
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.platform_settings (key, value) VALUES
  ('general', '{"platform_name": "SnapRoad", "platform_version": "2.0.1", "maintenance_mode": false, "debug_mode": false, "max_users": 50000, "default_language": "en"}'::jsonb),
  ('security', '{"jwt_expiry_hours": 24, "password_min_length": 8, "require_2fa": false, "session_timeout_minutes": 30, "max_login_attempts": 5, "ip_whitelist_enabled": false}'::jsonb),
  ('notifications', '{"email_notifications": true, "push_notifications": true, "sms_notifications": false, "marketing_emails": false, "system_alerts": true, "weekly_reports": true}'::jsonb),
  ('api', '{"rate_limit_per_minute": 100, "max_file_size_mb": 10, "enable_cors": true, "api_version": "v1", "webhook_timeout_seconds": 30}'::jsonb),
  ('features', '{"ai_moderation": true, "real_time_analytics": true, "partner_referrals": true, "boost_services": true, "premium_features": true, "beta_features": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  version TEXT DEFAULT '1.0',
  description TEXT,
  content TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (service role = backend)
-- ============================================================
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
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
    'incidents', 'campaigns', 'rewards', 'audit_log',
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

-- Optional: driver referral analytics (sb_get_referral_analytics uses verified_at)
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
