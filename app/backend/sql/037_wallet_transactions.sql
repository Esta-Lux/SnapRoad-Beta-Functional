-- Wallet ledger: append-only rows for gem credits/debits (trips, redemptions, challenges).
-- Backend writes via service role; optional app reads via RLS policies you add later.

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tx_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount INT NOT NULL CHECK (amount >= 0),
  balance_before INT,
  balance_after INT,
  reference_type TEXT,
  reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'posted',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON public.wallet_transactions (user_id, created_at DESC);

COMMENT ON TABLE public.wallet_transactions IS 'Authoritative append-only gem ledger; profiles.gems remains denormalized balance.';

-- Optional (run after backfill / dedupe): enforce one redemption per user per offer
-- CREATE UNIQUE INDEX idx_redemptions_user_offer_unique ON public.redemptions (user_id, offer_id);
