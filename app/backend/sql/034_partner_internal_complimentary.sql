-- Partner billing: admin-granted $0 / internal access (idempotent).
-- Rules (application + admin UI):
--   • subscription_status pending | incomplete → partner portal is limited to Plan & Pricing until Stripe completes,
--     unless is_internal_complimentary = true OR plan = 'internal' with subscription_status = 'active' (admin-set).
--   • is_internal_complimentary = true → full portal without paid Stripe; use with subscription_status = 'active'.
--   • Partners may always self-serve upgrade via Stripe to paid tiers; internal plan is not self-selectable in API.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS is_internal_complimentary BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.partners.subscription_status IS
'Billing state: pending|incomplete = complete checkout or admin grants internal access. active = full portal. Other values may mirror Stripe (trialing, past_due, canceled).';

COMMENT ON COLUMN public.partners.is_internal_complimentary IS
'Admin-granted complimentary access (no Stripe). When TRUE, pair with subscription_status active; optional plan internal for reporting.';

CREATE INDEX IF NOT EXISTS idx_partners_subscription_status ON public.partners (subscription_status);
CREATE INDEX IF NOT EXISTS idx_partners_internal_complimentary ON public.partners (is_internal_complimentary) WHERE is_internal_complimentary = TRUE;
