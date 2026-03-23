-- Family command center: events + notification preferences
-- Run in Supabase SQL editor after 006_family_mode.sql

CREATE TABLE IF NOT EXISTS public.family_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  place_id UUID,
  place_name TEXT,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_events_group_created
  ON public.family_events(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.family_member_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_arrival_home BOOLEAN DEFAULT true,
  notify_departure_school BOOLEAN DEFAULT true,
  notify_start_driving BOOLEAN DEFAULT true,
  notify_speed_exceeded BOOLEAN DEFAULT true,
  speed_threshold_mph INT DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_member_notifications_group_user
  ON public.family_member_notifications(group_id, user_id);

ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_member_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family can read family events" ON public.family_events;
CREATE POLICY "Family can read family events"
ON public.family_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = family_events.group_id
      AND fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Family members can create family events" ON public.family_events;
CREATE POLICY "Family members can create family events"
ON public.family_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = family_events.group_id
      AND fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can read own family notification prefs" ON public.family_member_notifications;
CREATE POLICY "Members can read own family notification prefs"
ON public.family_member_notifications FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = family_member_notifications.group_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Members can upsert own family notification prefs" ON public.family_member_notifications;
CREATE POLICY "Members can upsert own family notification prefs"
ON public.family_member_notifications FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = family_member_notifications.group_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Members can update own family notification prefs" ON public.family_member_notifications;
CREATE POLICY "Members can update own family notification prefs"
ON public.family_member_notifications FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = family_member_notifications.group_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.group_id = family_member_notifications.group_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
  )
);
