-- Align public.trips with POST /api/trips/complete (mobile trip completion).
-- Fixes "Trip storage unavailable" when legacy schemas omit columns the backend sends.

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS hard_braking_events INT DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS speeding_events INT DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS incidents_reported INT DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill user_id from profile_id when only legacy profile_id rows exist.
UPDATE public.trips
SET user_id = profile_id
WHERE user_id IS NULL AND profile_id IS NOT NULL;
