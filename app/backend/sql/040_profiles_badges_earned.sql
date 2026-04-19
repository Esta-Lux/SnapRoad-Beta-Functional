-- Earned driver-badge IDs (matches gamification ALL_BADGES id integers), persisted for production sync.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badges_earned JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.badges_earned IS 'JSON array of earned ALL_BADGES id integers; synced after trips and XP updates.';
