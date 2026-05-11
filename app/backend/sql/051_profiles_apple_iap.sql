-- Apple In-App Purchase linkage (consumer Premium / Family on iOS). Partner billing stays on Stripe.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS apple_last_transaction_id TEXT;

COMMENT ON COLUMN public.profiles.apple_original_transaction_id IS
  'Apple IAP subscription group original transaction id (renewals share this id).';
COMMENT ON COLUMN public.profiles.apple_last_transaction_id IS
  'Most recent verified App Store transaction id from server sync.';
