-- SnapRace Mode (frontend realtime via Supabase)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id),
  challenger_id UUID REFERENCES auth.users(id),
  route_polyline JSONB,
  origin JSONB,
  destination JSONB,
  status TEXT DEFAULT 'pending',
  creator_score INT,
  challenger_score INT,
  creator_time_seconds INT,
  challenger_time_seconds INT,
  gems_wagered INT DEFAULT 0,
  winner_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.races;

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Race participants can read and update" ON public.races;
CREATE POLICY "Race participants can read and update"
ON public.races FOR ALL
USING (auth.uid() = creator_id OR auth.uid() = challenger_id)
WITH CHECK (auth.uid() = creator_id OR auth.uid() = challenger_id);

