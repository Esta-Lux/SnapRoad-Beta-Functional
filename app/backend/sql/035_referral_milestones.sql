-- Referral milestone tracking: qualify when referee pays first subscription month (Stripe webhook).

ALTER TABLE public.partner_referrals
  ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.partner_referrals.qualified_at IS
'Set when referred partner completes first paid subscription checkout (Stripe). Milestone credits: +30 per each 5 qualified (max 4 tiers → 120).';

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.referrals.qualified_at IS
'Set when referred driver completes first premium/family subscription payment. Milestone gems: +60 per each 5 qualified (max 4 tiers → 240).';

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS referral_milestone_tiers_paid SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.partners.referral_milestone_tiers_paid IS
'Count of 5-partner blocks paid out (0–4). Earned credits = referral_milestone_tiers_paid * 30.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_milestone_tiers_paid SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.referral_milestone_tiers_paid IS
'Count of 5-driver blocks paid out (0–4). Milestone gems = referral_milestone_tiers_paid * 60.';

CREATE INDEX IF NOT EXISTS idx_partner_referrals_referred ON public.partner_referrals (referred_partner_id) WHERE referred_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_referrals_qualified ON public.partner_referrals (referrer_partner_id, qualified_at);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON public.referrals (referred_user_id) WHERE referred_user_id IS NOT NULL;
