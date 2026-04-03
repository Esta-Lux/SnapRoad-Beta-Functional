-- SnapRace challenges (server-authoritative gem stake + audit).
-- Apply with your usual Supabase migration flow.

CREATE TABLE IF NOT EXISTS public.snap_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  wager_gems INTEGER NOT NULL CHECK (wager_gems > 0 AND wager_gems <= 1000),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT snap_races_distinct CHECK (challenger_id <> opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_snap_races_challenger ON public.snap_races (challenger_id);
CREATE INDEX IF NOT EXISTS idx_snap_races_opponent ON public.snap_races (opponent_id);
CREATE INDEX IF NOT EXISTS idx_snap_races_created ON public.snap_races (created_at DESC);

COMMENT ON TABLE public.snap_races IS 'Friendly wager challenges; gems debited from challenger at start (MVP).';
