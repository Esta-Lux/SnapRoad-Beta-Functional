-- Road report voting integrity (Phase 2D)
-- Run in Supabase SQL editor

-- Ensure road_reports exists (Phase 2D backend reads/writes this table)
CREATE TABLE IF NOT EXISTS public.road_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  type TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  upvotes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_road_reports_status_expires
  ON public.road_reports(status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_road_reports_lat_lng
  ON public.road_reports(lat, lng);

ALTER TABLE public.road_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read road reports" ON public.road_reports;
CREATE POLICY "Authenticated can read road reports"
ON public.road_reports FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create own road reports" ON public.road_reports;
CREATE POLICY "Users can create own road reports"
ON public.road_reports FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE TABLE IF NOT EXISTS public.road_report_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.road_reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  vote SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_road_report_votes_report
  ON public.road_report_votes(report_id);

ALTER TABLE public.road_report_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own road report votes" ON public.road_report_votes;
CREATE POLICY "Users can read own road report votes"
ON public.road_report_votes FOR SELECT
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own road report votes" ON public.road_report_votes;
CREATE POLICY "Users can create own road report votes"
ON public.road_report_votes FOR INSERT
WITH CHECK (auth.uid()::text = user_id);
