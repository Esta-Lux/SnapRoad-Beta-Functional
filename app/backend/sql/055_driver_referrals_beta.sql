-- 055: Driver Referral (beta) — extend public.referrals with verification + reward columns,
-- enforce one-referrer-per-referred-user, and ensure every profile has a readable friend_code
-- usable as a shareable referral code (e.g. SNAP-{friend_code} link). Safe to re-run.
--
-- Prereqs: app/backend/sql/supabase_migration.sql (referrals table) and
-- app/backend/sql/014_align_schemas.sql / 017_profiles_boosts_badges.sql (profiles.friend_code).

-- ============================================================
-- 1. REFERRALS: beta verification + reward columns
-- ============================================================
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS gems_awarded INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.referrals.referral_code IS
  'Shareable code the referred user redeemed at signup (typically referrer profiles.friend_code).';
COMMENT ON COLUMN public.referrals.gems_awarded IS
  'Gems credited to the referrer for this referral (idempotency check: only award when 0).';
COMMENT ON COLUMN public.referrals.joined_at IS
  'When the referred user finished account creation.';
COMMENT ON COLUMN public.referrals.verified_at IS
  'When the referral was verified and gems were awarded (beta: same instant as joined_at).';
COMMENT ON COLUMN public.referrals.declined_at IS
  'When the referral was declined (invalid / duplicate / fraud / not eligible).';
COMMENT ON COLUMN public.referrals.decline_reason IS
  'Free-text reason for decline (used in admin views and logs).';

-- Touch updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION public.touch_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS referrals_set_updated_at ON public.referrals;
CREATE TRIGGER referrals_set_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.touch_referrals_updated_at();

-- ============================================================
-- 2. INDEXES
-- ============================================================
-- Enforce "one referrer per referred user" once the referred_user_id is known.
-- Partial unique index leaves pre-signup rows (referred_user_id IS NULL) unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_user_uidx
  ON public.referrals (referred_user_id)
  WHERE referred_user_id IS NOT NULL;

-- Fast dashboard reads: counts / lists per referrer + status.
CREATE INDEX IF NOT EXISTS referrals_referrer_status_idx
  ON public.referrals (referrer_id, status);

CREATE INDEX IF NOT EXISTS referrals_referrer_created_idx
  ON public.referrals (referrer_id, created_at DESC);

-- Lookups by code (used by /api/referrals/apply when a code is pasted).
CREATE INDEX IF NOT EXISTS referrals_referral_code_idx
  ON public.referrals (referral_code)
  WHERE referral_code IS NOT NULL;

-- ============================================================
-- 3. FRIEND_CODE: ensure every profile has one (used as referral code)
-- ============================================================
-- Backfill any NULLs (014_align_schemas.sql already runs this, but it is safe to re-run).
UPDATE public.profiles
SET friend_code = UPPER(SUBSTRING(md5(id::text || NOW()::text || random()::text) FROM 1 FOR 6))
WHERE friend_code IS NULL;

-- 014_align_schemas.sql installed BEFORE INSERT trigger set_friend_code; we keep it as-is.
-- (Existing 6-char hex codes remain valid; the mobile share text decorates them as SNAP-XXXXXX.)
