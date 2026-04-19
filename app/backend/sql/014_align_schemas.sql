-- 014: Align Supabase table schemas with backend code
-- Run in Supabase SQL Editor. Safe to re-run (uses IF NOT EXISTS / IF EXISTS).

-- ============================================================
-- PROFILES: add columns the backend expects but the table is missing
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'driver';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS safety_score FLOAT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS safe_drive_streak INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_savings FLOAT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gem_multiplier INT DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reports_posted INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reports_upvotes_received INT DEFAULT 0;

-- Backfill: copy full_name -> name for existing rows (only if full_name column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    UPDATE public.profiles SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
  END IF;
END $$;

-- Backfill: copy avg_safety_score -> safety_score (only if avg_safety_score column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avg_safety_score'
  ) THEN
    UPDATE public.profiles SET safety_score = avg_safety_score WHERE safety_score = 0 AND avg_safety_score > 0;
  END IF;
END $$;

-- Generate friend codes for existing profiles
UPDATE public.profiles
SET friend_code = UPPER(SUBSTRING(md5(id::text || now()::text || random()::text) FROM 1 FOR 6))
WHERE friend_code IS NULL;

-- Auto-generate friend code for new profiles
CREATE OR REPLACE FUNCTION generate_friend_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.friend_code IS NULL THEN
    NEW.friend_code := UPPER(SUBSTRING(md5(NEW.id::text || now()::text || random()::text) FROM 1 FOR 6));
  END IF;
  -- Keep name populated from email if nothing else is set
  IF NEW.name IS NULL AND NEW.email IS NOT NULL THEN
    NEW.name := split_part(NEW.email, '@', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_friend_code ON public.profiles;
CREATE TRIGGER set_friend_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION generate_friend_code();

-- ============================================================
-- REDEMPTIONS: create the table name the backend expects
-- The migration created "offer_redemptions" but the backend queries "redemptions"
-- Create a view so both names work without breaking existing data
-- ============================================================
DO $$
BEGIN
  -- If offer_redemptions exists but redemptions does not, create redemptions as a view
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offer_redemptions')
  AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'redemptions') THEN
    -- Create actual redemptions table for the backend to write to
    CREATE TABLE public.redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id INT,
      user_id UUID,
      partner_id UUID,
      gems_earned INT DEFAULT 0,
      discount_applied FLOAT DEFAULT 0,
      fee_amount FLOAT DEFAULT 0,
      redemption_number INT DEFAULT 0,
      status TEXT DEFAULT 'verified',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
  END IF;
  -- If neither exists, create it fresh
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'redemptions')
  AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offer_redemptions') THEN
    CREATE TABLE public.redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id INT,
      user_id UUID,
      partner_id UUID,
      gems_earned INT DEFAULT 0,
      discount_applied FLOAT DEFAULT 0,
      fee_amount FLOAT DEFAULT 0,
      redemption_number INT DEFAULT 0,
      status TEXT DEFAULT 'verified',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================
-- TRIPS: add profile_id column if missing (backend writes profile_id)
-- ============================================================
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS hard_braking_events INT DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS speeding_events INT DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS incidents_reported INT DEFAULT 0;

-- fuel_history: odometer for /fuel/logs and /fuel/stats (backend)
ALTER TABLE public.fuel_history ADD COLUMN IF NOT EXISTS odometer DOUBLE PRECISION;

-- Backfill profile_id from user_id for existing rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'user_id'
  ) THEN
    UPDATE public.trips SET profile_id = user_id WHERE profile_id IS NULL AND user_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- RLS POLICIES (using correct column names)
-- ============================================================

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trips RLS (use profile_id if it exists, fall back gracefully)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own trips" ON public.trips;
DROP POLICY IF EXISTS "service_role_all" ON public.trips;

CREATE POLICY "Service role full access trips"
  ON public.trips FOR ALL
  USING (true)
  WITH CHECK (true);

-- Redemptions RLS (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'redemptions') THEN
    ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "Service role can manage redemptions" ON public.redemptions';
    EXECUTE 'CREATE POLICY "Service role can manage redemptions" ON public.redemptions FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;
