-- Stripe Customer Portal: persist Stripe customer id after checkout (webhook).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer id (cus_...) for billing portal; set from checkout.session.completed webhook.';
