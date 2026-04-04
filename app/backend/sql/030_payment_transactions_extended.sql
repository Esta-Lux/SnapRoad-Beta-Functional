-- Extended Stripe fields for payment_transactions (webhook + analytics).
-- Apply in Supabase SQL editor or via migration pipeline before relying on webhooks.py upserts.

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_amount_cents INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_sub
  ON public.payment_transactions(stripe_subscription_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_idempotency_key_unique
  ON public.payment_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';
