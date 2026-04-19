-- Friend location sharing & friendships
-- Run in Supabase SQL Editor. Requires auth.users (Supabase Auth).

-- ============================================================
-- FRIENDSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own friendships"
ON public.friendships FOR ALL
USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- ============================================================
-- LIVE LOCATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.live_locations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed_mph DOUBLE PRECISION,
  is_navigating BOOLEAN DEFAULT FALSE,
  destination_name TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  is_sharing BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own location"
ON public.live_locations FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Friends can read locations"
ON public.live_locations FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (
      (f.user_id_1 = auth.uid() AND f.user_id_2 = live_locations.user_id)
      OR (f.user_id_2 = auth.uid() AND f.user_id_1 = live_locations.user_id)
    )
    AND f.status = 'accepted'
  )
);

-- Enable Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;

-- ============================================================
-- FRIEND LOCATIONS VIEW (profiles + live_locations)
-- ============================================================
CREATE OR REPLACE VIEW public.friend_locations AS
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Friend') AS name,
  u.raw_user_meta_data->>'avatar_url' AS avatar,
  ll.lat,
  ll.lng,
  ll.heading,
  ll.speed_mph,
  ll.is_navigating,
  ll.destination_name,
  ll.last_updated,
  ll.is_sharing
FROM auth.users u
JOIN public.live_locations ll ON u.id = ll.user_id;

-- ============================================================
-- LOCATION TAGS (send location to a friend)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.location_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  message TEXT DEFAULT 'Check out where I am!',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.location_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own location tags"
ON public.location_tags FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can read location tags sent to them"
ON public.location_tags FOR SELECT
USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
