-- Local offers (public.offers) pricing parity with admin "paste link" UX.
-- `original_price` already exists (003_tiered_offers.sql) — it doubles as the regular / list price.
-- Add `sale_price` so admins can capture the absolute discounted price when pasting a product link,
-- without forcing the discount to be expressed only as a percent.

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12, 2);

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS source_url TEXT;

COMMENT ON COLUMN public.offers.sale_price IS
  'Discounted price (what the buyer pays) when admin captures absolute pricing from a pasted link.';
COMMENT ON COLUMN public.offers.source_url IS
  'Original product / deal URL the admin pasted into the link unfurler.';
