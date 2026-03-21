-- Concerns (user feedback) and app_config (remote control flags)
-- Run in Supabase SQL Editor after 004_friend_locations.sql.

-- ============================================================
-- CONCERNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.concerns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concerns_status ON public.concerns(status);
CREATE INDEX IF NOT EXISTS idx_concerns_severity ON public.concerns(severity);
CREATE INDEX IF NOT EXISTS idx_concerns_created_at ON public.concerns(created_at DESC);

ALTER TABLE public.concerns ENABLE ROW LEVEL SECURITY;

-- Backend service role bypasses RLS; optional: allow users to insert own
CREATE POLICY "Users can insert own concerns"
ON public.concerns FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- APP_CONFIG TABLE (remote control flags)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Service role only in practice; no policy needed for server-side access

-- Default config (JSONB: false, true, number, string)
INSERT INTO public.app_config (key, value, updated_at) VALUES
  ('maintenance_mode', 'false'::jsonb, NOW()),
  ('force_update_required', 'false'::jsonb, NOW()),
  ('orion_enabled', 'true'::jsonb, NOW()),
  ('friend_tracking_enabled', 'true'::jsonb, NOW()),
  ('ohgo_cameras_enabled', 'true'::jsonb, NOW()),
  ('gems_multiplier', '1'::jsonb, NOW()),
  ('max_offer_distance_miles', '5'::jsonb, NOW()),
  ('announcement_banner', '""'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
