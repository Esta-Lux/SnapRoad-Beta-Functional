-- Separate downvote tally (expiry when downvotes > upvotes) + last-known map position for nearby incident pushes.

ALTER TABLE public.road_reports
  ADD COLUMN IF NOT EXISTS downvotes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_known_lat DOUBLE PRECISION;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_known_lng DOUBLE PRECISION;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_known_at TIMESTAMPTZ;

COMMENT ON COLUMN public.road_reports.downvotes IS 'Peer downvotes; report hidden when downvotes > upvotes.';
COMMENT ON COLUMN public.profiles.last_known_lat IS 'Last map session position (for ~1mi incident alerts; optional).';
