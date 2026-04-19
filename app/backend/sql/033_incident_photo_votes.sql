-- Support up (+1) and down (-1) votes on photo reports (net score in incident_photos.upvotes).
ALTER TABLE public.incident_photo_upvotes
  ADD COLUMN IF NOT EXISTS vote SMALLINT NOT NULL DEFAULT 1;

UPDATE public.incident_photo_upvotes SET vote = 1 WHERE vote IS NULL;

COMMENT ON COLUMN public.incident_photo_upvotes.vote IS '+1 confirm / -1 not there (one row per voter)';
