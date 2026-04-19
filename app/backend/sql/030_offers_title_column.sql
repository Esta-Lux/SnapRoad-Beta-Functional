-- Optional: add headline column for offers (partner/admin UIs).
-- Run in Supabase SQL Editor if you want a dedicated `title` distinct from business_name.
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS title TEXT;
