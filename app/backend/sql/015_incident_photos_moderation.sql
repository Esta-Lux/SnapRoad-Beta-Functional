-- Privacy moderation for incident_photos: blur-before-public + admin queue
-- Create a PRIVATE Storage bucket in Supabase Dashboard named `incident_photo_originals`
-- (disable public access). Service role uploads originals pending review there.

ALTER TABLE public.incident_photos
  ALTER COLUMN photo_url DROP NOT NULL;

ALTER TABLE public.incident_photos
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS blur_applied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_admin_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

COMMENT ON COLUMN public.incident_photos.moderation_status IS 'active | pending_review | rejected';
COMMENT ON COLUMN public.incident_photos.original_storage_path IS 'Path in private bucket incident_photo_originals';

CREATE INDEX IF NOT EXISTS incident_photos_moderation_idx ON public.incident_photos(moderation_status);
