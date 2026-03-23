-- Photo incident reports (backend /api/photo-reports/*)
-- Run in Supabase SQL Editor

-- ============================================================
-- INCIDENT PHOTOS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  photo_url TEXT NOT NULL,
  category TEXT,
  ai_category TEXT,
  description TEXT,
  upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS incident_photos_lat_idx ON public.incident_photos(lat);
CREATE INDEX IF NOT EXISTS incident_photos_lng_idx ON public.incident_photos(lng);
CREATE INDEX IF NOT EXISTS incident_photos_expires_at_idx ON public.incident_photos(expires_at);

ALTER TABLE public.incident_photos ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read non-expired photos (filter still applied in API).
DROP POLICY IF EXISTS "Authenticated can read incident photos" ON public.incident_photos;
CREATE POLICY "Authenticated can read incident photos"
ON public.incident_photos FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can insert their own photos
DROP POLICY IF EXISTS "Users can create incident photos" ON public.incident_photos;
CREATE POLICY "Users can create incident photos"
ON public.incident_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RPC: increment upvotes
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_upvotes(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.incident_photos
  SET upvotes = COALESCE(upvotes, 0) + 1
  WHERE id = report_id;
END;
$$;

