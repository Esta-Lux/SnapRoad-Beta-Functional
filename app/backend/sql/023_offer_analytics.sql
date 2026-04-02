CREATE TABLE IF NOT EXISTS public.offer_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id INT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'visit', 'redeem')),
  partner_id UUID,
  user_id UUID,
  location_id INT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  trip_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_analytics_offer_event_created
  ON public.offer_analytics(offer_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offer_analytics_partner_created
  ON public.offer_analytics(partner_id, created_at DESC);

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS offer_type TEXT NOT NULL DEFAULT 'partner';

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS visit_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS redemption_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS allocated_locations JSONB NOT NULL DEFAULT '[]'::jsonb;
