-- SnapRoad Supabase Migration
-- Run in Supabase SQL Editor (Auth enabled so auth.users exists).
--
-- RECOMMENDED ORDER (greenfield):
--   1) supabase_migration.sql (this file)
--   2) 017_profiles_boosts_badges.sql
--   3) 014_align_schemas.sql
--   4) 016_profiles_stripe_customer.sql
--   5) 018_admin_runtime_tables.sql  → incidents, campaigns, rewards, audit_log, platform_settings,
--                                       legal_documents + notification columns (admin API / test_connection)
--   5b) 019_partners_founders_subscription.sql → optional partners.is_founders, subscription_status
--   6) 002_redemption_fees.sql   → fee columns, partner_team_links (redemptions fees if not in 014)
--   7) 003_tiered_offers.sql
--   8) 004_friend_locations.sql → 005 → 006_family_mode.sql → 006_operational_runtime_flags.sql
--   9) 007 → 008 → 009 → 010 → 011 → 012 → 015_incident_photos_moderation.sql
--   (013 is deprecated; 014 replaces it. admin_dashboard_migration.sql is optional: skip if you ran 018;
--    it overlaps trips/referrals/notifications and can confuse schema—prefer supabase + 017 + 014 + 018.)
--
-- User FKs reference auth.users(id), not public.users (that table is not created here).

-- ============================================================
-- LEGACY public.users (optional — only if you still have this table from an old template)
-- ============================================================
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS safety_score INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safe_drive_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_miles FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'OH',
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS gem_multiplier INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS member_since TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_selected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS car_selected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reports_posted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_upvotes_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owned_cars INTEGER[] DEFAULT '{1}',
  ADD COLUMN IF NOT EXISTS equipped_car INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS owned_skins INTEGER[] DEFAULT '{1}',
  ADD COLUMN IF NOT EXISTS equipped_skin INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS friends TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'driver',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- PARTNERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'retail',
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  lat FLOAT,
  lng FLOAT,
  plan TEXT DEFAULT 'local',
  max_locations INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active',
  is_approved BOOLEAN DEFAULT TRUE,
  total_redemptions INTEGER DEFAULT 0,
  credits_balance FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PARTNER LOCATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_locations (
  id SERIAL PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- OFFERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.offers (
  id SERIAL PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  business_type TEXT DEFAULT 'retail',
  description TEXT NOT NULL,
  base_gems INTEGER DEFAULT 25,
  discount_percent INTEGER DEFAULT 0,
  address TEXT,
  lat FLOAT,
  lng FLOAT,
  offer_url TEXT,
  is_admin_offer BOOLEAN DEFAULT FALSE,
  created_by TEXT DEFAULT 'business',
  redemption_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  location_id INTEGER REFERENCES public.partner_locations(id) ON DELETE SET NULL,
  image_url TEXT,
  boost_multiplier FLOAT DEFAULT 1.0,
  boost_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- ============================================================
-- TRIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_lat FLOAT,
  start_lng FLOAT,
  end_lat FLOAT,
  end_lng FLOAT,
  distance_miles FLOAT DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  safety_score INTEGER DEFAULT 100,
  gems_earned INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  max_speed FLOAT,
  avg_speed FLOAT,
  hard_brakes INTEGER DEFAULT 0,
  sharp_turns INTEGER DEFAULT 0,
  phone_usage_events INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ROAD REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.road_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  address TEXT,
  upvotes INTEGER DEFAULT 0,
  image_url TEXT,
  is_blurred BOOLEAN DEFAULT FALSE,
  confidence FLOAT DEFAULT 0,
  moderation_status TEXT DEFAULT 'new',
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'weekly',
  gems_multiplier FLOAT DEFAULT 1.0,
  xp_bonus INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- CHALLENGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'daily',
  target INTEGER NOT NULL,
  metric TEXT DEFAULT 'trips',
  gems_reward INTEGER DEFAULT 50,
  xp_reward INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- USER CHALLENGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- ============================================================
-- FUEL HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fuel_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gallons FLOAT NOT NULL,
  price_per_gallon FLOAT NOT NULL,
  total_cost FLOAT NOT NULL,
  station_name TEXT,
  lat FLOAT,
  lng FLOAT,
  odometer DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- OFFER REDEMPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.offer_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id INTEGER REFERENCES public.offers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  gems_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- REFERRALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer_email TEXT,
  referred_email TEXT,
  status TEXT DEFAULT 'pending',
  credits_awarded FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PARTNER REFERRALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  referred_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  credits_awarded FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SEED: Default partner account
-- ============================================================
INSERT INTO public.partners (business_name, business_type, email, plan, status)
VALUES ('SnapRoad Demo Partner', 'retail', 'partner@snaproad.com', 'growth', 'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (basic setup)
-- ============================================================
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_history ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for backend)
CREATE POLICY "service_role_all" ON public.partners FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.offers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.trips FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.road_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.fuel_history FOR ALL TO service_role USING (true) WITH CHECK (true);
