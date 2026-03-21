-- Family Mode (Life360-like) foundation
-- Run in Supabase SQL Editor
-- Requires: auth.users, public.live_locations (from 004_friend_locations.sql)

-- ============================================================
-- FAMILY GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FAMILY MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  max_speed_mph INT DEFAULT 80,
  curfew_time TIME,
  focus_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================================
-- PLACE ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.place_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.family_groups(id),
  created_by UUID REFERENCES auth.users(id),
  watch_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_meters INT DEFAULT 200,
  alert_on TEXT DEFAULT 'arrive',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FAMILY TRIPS (summary rows linked to app trips)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.family_groups(id),
  user_id UUID REFERENCES auth.users(id),
  trip_id UUID,
  safety_score INT,
  max_speed_mph FLOAT,
  hard_braking_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LIVE LOCATIONS EXTENSIONS
-- ============================================================
ALTER TABLE public.live_locations
  ADD COLUMN IF NOT EXISTS sos_active BOOLEAN DEFAULT false;

ALTER TABLE public.live_locations
  ADD COLUMN IF NOT EXISTS speed_trail JSONB;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_alerts ENABLE ROW LEVEL SECURITY;

-- Members can read their group membership rows
DROP POLICY IF EXISTS "Family members can read their group" ON public.family_members;
CREATE POLICY "Family members can read their group"
ON public.family_members FOR SELECT
USING (
  auth.uid() IN (
    SELECT fm2.user_id FROM public.family_members fm2
    WHERE fm2.group_id = family_members.group_id
  )
);

-- Users can create groups for themselves
DROP POLICY IF EXISTS "Users can create family groups" ON public.family_groups;
CREATE POLICY "Users can create family groups"
ON public.family_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can read groups they belong to (or created)
DROP POLICY IF EXISTS "Users can read own family groups" ON public.family_groups;
CREATE POLICY "Users can read own family groups"
ON public.family_groups FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = family_groups.id AND fm.user_id = auth.uid()
  )
);

-- Allow join flow: authenticated users can look up a group by invite_code.
-- NOTE: This is permissive (leaks group names/codes to authenticated users). Tighten later via RPC.
DROP POLICY IF EXISTS "Authenticated can lookup family group by code" ON public.family_groups;
CREATE POLICY "Authenticated can lookup family group by code"
ON public.family_groups FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can insert themselves as a member (join)
DROP POLICY IF EXISTS "Users can join family group" ON public.family_members;
CREATE POLICY "Users can join family group"
ON public.family_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Members can update their own settings row
DROP POLICY IF EXISTS "Members can update own settings" ON public.family_members;
CREATE POLICY "Members can update own settings"
ON public.family_members FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Place alerts: members can read alerts for their group
DROP POLICY IF EXISTS "Family can read place alerts" ON public.place_alerts;
CREATE POLICY "Family can read place alerts"
ON public.place_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = place_alerts.group_id AND fm.user_id = auth.uid()
  )
);

-- Place alerts: members can create alerts within their group
DROP POLICY IF EXISTS "Family can create place alerts" ON public.place_alerts;
CREATE POLICY "Family can create place alerts"
ON public.place_alerts FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = place_alerts.group_id AND fm.user_id = auth.uid()
  )
);

-- Place alerts: creators can update their own alerts
DROP POLICY IF EXISTS "Creators can update place alerts" ON public.place_alerts;
CREATE POLICY "Creators can update place alerts"
ON public.place_alerts FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

