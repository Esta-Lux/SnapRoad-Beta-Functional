CREATE TABLE IF NOT EXISTS public.convoys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID REFERENCES auth.users(id),
  group_id UUID REFERENCES family_groups(id),
  destination JSONB,
  member_ids UUID[],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.convoys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Convoy members access" ON public.convoys;
CREATE POLICY "Convoy members access" ON public.convoys FOR ALL
  USING ((SELECT auth.uid()) = leader_id OR (SELECT auth.uid()) = ANY(member_ids));

ALTER PUBLICATION supabase_realtime ADD TABLE public.convoys;

ALTER TABLE public.live_locations
  ADD COLUMN IF NOT EXISTS privacy_window_until TIMESTAMPTZ;
