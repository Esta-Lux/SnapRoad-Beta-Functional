-- Product image gallery for admin-published online offers (JSON-LD / scraper output).
-- Hero remains in image_url; image_urls holds additional product shots for mobile carousels.

ALTER TABLE public.online_offers
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.online_offers.image_urls IS
  'Ordered gallery of product/deal image URLs (not logos). Populated by url unfurler + rescrape.';
