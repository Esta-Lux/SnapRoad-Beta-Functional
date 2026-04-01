-- 017: Baseline tables for profiles, boosts, and badges
-- Apply after app/backend/sql/supabase_migration.sql (partners, offers, etc.) so
-- foreign keys resolve if you uncomment them later. Safe to re-run.
--
-- Then run 014_align_schemas.sql (friend_code trigger, RLS, redemptions/trips tweaks)
-- and 016_profiles_stripe_customer.sql — their ALTERs are IF NOT EXISTS no-ops when
-- columns already exist from this file.

-- ============================================================
-- PROFILES (drivers / app users; id often matches auth.users)
-- Columns align with 014_align_schemas.sql + 016_profiles_stripe_customer.sql + backend usage.
-- No FK on id: registration can create a profile-only row with a standalone UUID.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'driver',
  status TEXT DEFAULT 'active',
  password_hash TEXT,
  safety_score DOUBLE PRECISION DEFAULT 0,
  streak INTEGER DEFAULT 0,
  safe_drive_streak INTEGER DEFAULT 0,
  state TEXT,
  city TEXT,
  total_savings DOUBLE PRECISION DEFAULT 0,
  gem_multiplier INTEGER DEFAULT 1,
  partner_id UUID,
  friend_code TEXT UNIQUE,
  reports_posted INTEGER DEFAULT 0,
  reports_upvotes_received INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  gems INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 0,
  xp_progress INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'basic',
  is_premium BOOLEAN DEFAULT FALSE,
  total_miles DOUBLE PRECISION DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  vehicle_height_meters DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'App user profile; backend keys off id (often equals auth.users.id).';
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer id (cus_...) for billing portal; set from checkout.session.completed webhook or /api/payments billing portal flow.';

-- ============================================================
-- BOOSTS (partner offer boosts; sb_create_boost / webhooks)
-- offer_id matches public.offers.id (SERIAL) where that table exists.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id INTEGER,
  partner_id UUID,
  budget DOUBLE PRECISION DEFAULT 0,
  duration_days INTEGER DEFAULT 0,
  target_radius_miles INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boosts_partner_id ON public.boosts (partner_id);
CREATE INDEX IF NOT EXISTS idx_boosts_offer_id ON public.boosts (offer_id);
CREATE INDEX IF NOT EXISTS idx_boosts_status ON public.boosts (status);

COMMENT ON TABLE public.boosts IS 'Paid/geo offer boosts; cancel sets status to cancelled (backend).';

-- Optional: enforce referential integrity once offers/partners exist
-- ALTER TABLE public.boosts
--   ADD CONSTRAINT boosts_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers (id) ON DELETE SET NULL;
-- ALTER TABLE public.boosts
--   ADD CONSTRAINT boosts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners (id) ON DELETE SET NULL;

-- ============================================================
-- BADGES (catalog; sb_get_badges — shape matches mock ALL_BADGES)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  requirement INTEGER DEFAULT 0,
  gems INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges (category);

COMMENT ON TABLE public.badges IS 'Badge definitions; mobile/API may still use in-code catalog when rows are empty.';
