-- Online (e-commerce / affiliate) offers stored in DB so admin can paste a link → preview → publish.
-- Local offers continue to live in `public.offers`. This table powers the mobile Offers tab "Online" pane
-- (see services/online_offers_provider.py → fetch_online_catalog).

CREATE TABLE IF NOT EXISTS public.online_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  affiliate_url TEXT,
  asin TEXT,
  title TEXT NOT NULL,
  description TEXT,
  merchant_name TEXT,
  merchant_domain TEXT,
  image_url TEXT,
  regular_price NUMERIC(12, 2),
  sale_price NUMERIC(12, 2),
  currency TEXT DEFAULT 'USD',
  discount_label TEXT,
  category_slug TEXT,
  category_label TEXT,
  featured BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  raw_metadata JSONB,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_online_offers_status_created
  ON public.online_offers (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_online_offers_featured_status
  ON public.online_offers (featured DESC, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_online_offers_category
  ON public.online_offers (category_slug);

CREATE INDEX IF NOT EXISTS idx_online_offers_asin
  ON public.online_offers (asin) WHERE asin IS NOT NULL;

COMMENT ON TABLE public.online_offers IS
  'Admin-published online / e-commerce offers (mirror of pasted product URLs). Read by GET /api/offers/online.';
COMMENT ON COLUMN public.online_offers.source_url IS
  'Original product URL the admin pasted (canonical / final URL after redirect resolution).';
COMMENT ON COLUMN public.online_offers.affiliate_url IS
  'Outbound link the mobile card opens. Defaults to source_url; admin can override with an affiliate-tagged variant.';
COMMENT ON COLUMN public.online_offers.asin IS
  'Amazon ASIN extracted from amzn.to / amazon.com URLs (NULL for non-Amazon links).';
COMMENT ON COLUMN public.online_offers.regular_price IS
  'List / "regular" price before discount, in `currency`. NULL when the source page does not expose it.';
COMMENT ON COLUMN public.online_offers.sale_price IS
  'Discounted / current price the buyer pays, in `currency`. NULL when source has only a single price.';
COMMENT ON COLUMN public.online_offers.raw_metadata IS
  'Snapshot of the unfurled metadata (jsonld_product, og_tags) for audit / re-parse.';
