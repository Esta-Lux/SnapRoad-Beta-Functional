-- ============================================================
-- SnapRoad Redemption Fees Migration
-- Adds fee tracking to partners and extends redemptions table
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE IF EXISTS public.partners
  ADD COLUMN IF NOT EXISTS total_fees_owed FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_fees_paid FLOAT DEFAULT 0;

ALTER TABLE IF EXISTS public.offers
  ADD COLUMN IF NOT EXISTS premium_discount_percent INTEGER,
  ADD COLUMN IF NOT EXISTS free_discount_percent INTEGER,
  ADD COLUMN IF NOT EXISTS is_free_item BOOLEAN DEFAULT FALSE;

-- 014_align_schemas.sql creates public.redemptions; skip silently if not present yet.
ALTER TABLE IF EXISTS public.redemptions
  ADD COLUMN IF NOT EXISTS fee_amount FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS redemption_number INTEGER DEFAULT 0;

-- Team links for partner QR scanning (Feature 4)
CREATE TABLE IF NOT EXISTS public.partner_team_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  label TEXT DEFAULT 'Team Link',
  created_by TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new table
ALTER TABLE public.partner_team_links ENABLE ROW LEVEL SECURITY;
