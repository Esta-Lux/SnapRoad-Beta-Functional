-- User saved places (production persistence for /api/locations)
-- Commute / saved route alerts (A→B with leave-by and push dispatch)

CREATE TABLE IF NOT EXISTS public.user_saved_places (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'favorite',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_saved_places_user_id ON public.user_saved_places(user_id);

CREATE TABLE IF NOT EXISTS public.commute_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Commute',
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  origin_label TEXT NOT NULL DEFAULT '',
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  dest_label TEXT NOT NULL DEFAULT '',
  leave_by_time TEXT NOT NULL,
  tz TEXT NOT NULL DEFAULT 'America/New_York',
  alert_minutes_before INT NOT NULL DEFAULT 120,
  days_of_week TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun']::TEXT[],
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  last_push_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commute_routes_user_id ON public.commute_routes(user_id);
