-- ============================================================
-- SnapRoad Tiered Offers Migration
-- Adds offer_source, affiliate tracking, and Yelp enrichment
-- Run in Supabase SQL Editor
-- ============================================================

-- Tier classification
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS offer_source TEXT DEFAULT 'direct';

-- Affiliate / Groupon fields
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS original_price FLOAT,
  ADD COLUMN IF NOT EXISTS affiliate_commission FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Yelp enrichment fields
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS yelp_rating FLOAT,
  ADD COLUMN IF NOT EXISTS yelp_review_count INTEGER,
  ADD COLUMN IF NOT EXISTS yelp_image_url TEXT;

-- Index for dedup on external imports
CREATE INDEX IF NOT EXISTS idx_offers_external_id ON public.offers (external_id)
  WHERE external_id IS NOT NULL;

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_offers_source ON public.offers (offer_source);
