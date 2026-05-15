-- Guest usage archive for signed-out SnapRoad sessions.
-- Product rule: guests may use public drive, cameras, and offers without creating auth.users rows.

CREATE TABLE IF NOT EXISTS public.guest_sessions (
  guest_id TEXT PRIMARY KEY CHECK (guest_id ~ '^guest_[A-Za-z0-9_-]{8,80}$'),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_count INTEGER NOT NULL DEFAULT 0,
  total_trips INTEGER NOT NULL DEFAULT 0,
  total_miles DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_savings DOUBLE PRECISION NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.guest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id TEXT NOT NULL REFERENCES public.guest_sessions(guest_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  trip_id TEXT,
  offer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_events_guest_created
  ON public.guest_events(guest_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guest_events_type_created
  ON public.guest_events(event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.bump_guest_session_from_event()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guest_sessions
  SET
    last_seen_at = COALESCE(NEW.created_at, NOW()),
    event_count = COALESCE(event_count, 0) + 1,
    total_trips = CASE WHEN NEW.event_type = 'trip_complete' THEN COALESCE(total_trips, 0) + 1 ELSE COALESCE(total_trips, 0) END,
    total_miles = COALESCE(total_miles, 0) + COALESCE((NEW.metadata->>'distance_miles')::DOUBLE PRECISION, 0),
    total_savings = COALESCE(total_savings, 0) + COALESCE((NEW.metadata->>'estimated_savings_usd')::DOUBLE PRECISION, 0)
  WHERE guest_id = NEW.guest_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guest_events_bump_session ON public.guest_events;
CREATE TRIGGER guest_events_bump_session
AFTER INSERT ON public.guest_events
FOR EACH ROW EXECUTE FUNCTION public.bump_guest_session_from_event();
