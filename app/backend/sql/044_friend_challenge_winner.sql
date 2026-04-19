-- Outcome for head-to-head friend challenges (best safety_score wins at ends_at).

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_friend_challenges_winner ON public.friend_challenges (winner_id)
  WHERE winner_id IS NOT NULL;

COMMENT ON COLUMN public.friend_challenges.winner_id IS 'Set when status=completed; NULL means draw. Scores in your_score/opponent_score track challenger vs opponent best trip safety during active window.';
