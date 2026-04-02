-- Driver incident reports: admin moderation before public map visibility
-- Run in Supabase SQL editor (or your migration pipeline).

ALTER TABLE public.road_reports
  ADD COLUMN IF NOT EXISTS moderation_status TEXT;

-- Existing rows stay visible to drivers (treat NULL as approved for legacy data).
UPDATE public.road_reports
SET moderation_status = 'approved'
WHERE moderation_status IS NULL;

-- New submissions default to pending (see backend insert); optional DB default:
-- ALTER TABLE public.road_reports ALTER COLUMN moderation_status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_road_reports_moderation_status
  ON public.road_reports(moderation_status, status, expires_at DESC);
