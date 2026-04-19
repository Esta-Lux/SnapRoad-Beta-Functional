-- Optional: columns referenced by admin/partner APIs (sb_get_partners select list).
-- Safe to re-run. Run in Supabase SQL Editor if partner dashboard or analytics expects these fields.

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS is_founders BOOLEAN DEFAULT FALSE;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
