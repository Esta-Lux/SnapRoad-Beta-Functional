-- Track whether subscription tier is managed by Stripe vs admin vs time-boxed promo.
-- When plan_entitlement_source = 'admin', driver app cannot self-downgrade to basic via POST /api/user/plan.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_entitlement_source TEXT;

COMMENT ON COLUMN public.profiles.plan_entitlement_source IS
  'stripe | admin | promo | NULL — admin sets admin to lock in-app plan downgrades; Stripe checkout sets stripe.';

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS plan_entitlement_source TEXT;

COMMENT ON COLUMN public.partners.plan_entitlement_source IS
  'stripe | admin | promo | NULL — admin portal plan changes set admin for parity with driver profiles.';
