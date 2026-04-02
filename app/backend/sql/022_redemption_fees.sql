CREATE TABLE IF NOT EXISTS public.redemption_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  redemption_count INT NOT NULL DEFAULT 0,
  total_fees_cents INT NOT NULL DEFAULT 0,
  last_redemption_at TIMESTAMPTZ,
  reset_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_redemption_fees_partner_month
  ON public.redemption_fees(partner_id, month_year);

CREATE INDEX IF NOT EXISTS idx_redemption_fees_month
  ON public.redemption_fees(month_year, created_at DESC);

ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS fee_cents INT NOT NULL DEFAULT 0;

ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS fee_tier INT NOT NULL DEFAULT 1;

ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS scanned_by_user_id UUID;

ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS qr_nonce TEXT;

ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ DEFAULT NOW();
