-- Head-to-head friend challenges (creator stake, optional message, Supabase persistence).
-- Server debits challenger gems on create; opponent gems on accept when stake > 0.

CREATE TABLE IF NOT EXISTS public.friend_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stake_gems INTEGER NOT NULL DEFAULT 0 CHECK (stake_gems >= 0 AND stake_gems <= 10000),
  duration_hours INTEGER NOT NULL DEFAULT 72 CHECK (duration_hours >= 1 AND duration_hours <= 720),
  challenge_type TEXT NOT NULL DEFAULT 'safest_drive',
  custom_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'completed', 'cancelled')
  ),
  challenger_name TEXT,
  opponent_name TEXT,
  your_score INTEGER,
  opponent_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  CONSTRAINT friend_challenges_distinct CHECK (challenger_id <> opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_challenges_challenger ON public.friend_challenges (challenger_id);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_opponent ON public.friend_challenges (opponent_id);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_created ON public.friend_challenges (created_at DESC);

ALTER TABLE public.friend_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_friend_challenges" ON public.friend_challenges;
CREATE POLICY "service_role_all_friend_challenges"
ON public.friend_challenges FOR ALL TO service_role
USING (true) WITH CHECK (true);

COMMENT ON TABLE public.friend_challenges IS 'P2P driving challenges; gems debited from challenger at pending create, from opponent on accept.';
