ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS credits NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS credit_balance_updated_at TIMESTAMPTZ;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS boosted_redemptions INT NOT NULL DEFAULT 0;
