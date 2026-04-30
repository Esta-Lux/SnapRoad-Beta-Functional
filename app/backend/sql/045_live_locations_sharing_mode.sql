-- Live friend sharing mode: foreground sharing vs explicit Always Follow background sharing.

ALTER TABLE public.live_locations
ADD COLUMN IF NOT EXISTS sharing_mode TEXT NOT NULL DEFAULT 'while_using';

ALTER TABLE public.live_locations
DROP CONSTRAINT IF EXISTS live_locations_sharing_mode_check;

ALTER TABLE public.live_locations
ADD CONSTRAINT live_locations_sharing_mode_check
CHECK (sharing_mode IN ('while_using', 'always_follow'));

COMMENT ON COLUMN public.live_locations.sharing_mode IS
  'Friend live-sharing mode. is_sharing=false means off; while_using publishes from active app, always_follow may publish in background with OS permission.';
