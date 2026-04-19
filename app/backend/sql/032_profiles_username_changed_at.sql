-- Tracks last username (display name) change for a 14-day cooldown between edits.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.username_changed_at IS 'Set when name/full_name is changed via profile update; next change allowed after 14 days.';
