-- 020: Prelaunch security hardening
-- Adds soft-delete fields, signup DOB storage, critical indexes, and missing-table RLS policies.

-- ============================================================
-- PROFILE / ACCOUNT SOFT DELETE FIELDS
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- LAUNCH-CRITICAL INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_offers_partner_id
  ON public.offers(partner_id);

CREATE INDEX IF NOT EXISTS idx_offers_status
  ON public.offers(status);

CREATE INDEX IF NOT EXISTS idx_offers_lat_lng
  ON public.offers(lat, lng);

CREATE INDEX IF NOT EXISTS idx_partner_locations_partner_id
  ON public.partner_locations(partner_id);

CREATE INDEX IF NOT EXISTS idx_fuel_history_user_id
  ON public.fuel_history(user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'profile_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trips_profile_id ON public.trips(profile_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trips_created_at ON public.trips(created_at DESC)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'profile_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'payment_status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(payment_status)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'redemptions' AND column_name = 'partner_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_redemptions_partner_id ON public.redemptions(partner_id)';
  END IF;
END
$$;

-- ============================================================
-- MISSING-TABLE RLS POLICIES
-- ============================================================
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_team_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_boosts" ON public.boosts;
CREATE POLICY "service_role_all_boosts"
ON public.boosts FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_badges" ON public.badges;
CREATE POLICY "service_role_all_badges"
ON public.badges FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read badges" ON public.badges;
CREATE POLICY "Authenticated can read badges"
ON public.badges FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "service_role_all_challenges" ON public.challenges;
CREATE POLICY "service_role_all_challenges"
ON public.challenges FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read active challenges" ON public.challenges;
CREATE POLICY "Authenticated can read active challenges"
ON public.challenges FOR SELECT TO authenticated
USING (COALESCE(is_active, true));

DROP POLICY IF EXISTS "service_role_all_user_challenges" ON public.user_challenges;
CREATE POLICY "service_role_all_user_challenges"
ON public.user_challenges FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users manage own challenge progress" ON public.user_challenges;
CREATE POLICY "Users manage own challenge progress"
ON public.user_challenges FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_role_all_partner_locations" ON public.partner_locations;
CREATE POLICY "service_role_all_partner_locations"
ON public.partner_locations FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_offer_redemptions" ON public.offer_redemptions;
CREATE POLICY "service_role_all_offer_redemptions"
ON public.offer_redemptions FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own offer redemptions" ON public.offer_redemptions;
CREATE POLICY "Users can read own offer redemptions"
ON public.offer_redemptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_role_all_partner_team_links" ON public.partner_team_links;
CREATE POLICY "service_role_all_partner_team_links"
ON public.partner_team_links FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_app_config" ON public.app_config;
CREATE POLICY "service_role_all_app_config"
ON public.app_config FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read app config" ON public.app_config;
CREATE POLICY "Authenticated can read app config"
ON public.app_config FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "service_role_all_family_trips" ON public.family_trips;
CREATE POLICY "service_role_all_family_trips"
ON public.family_trips FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Family members can read family trips" ON public.family_trips;
CREATE POLICY "Family members can read family trips"
ON public.family_trips FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.group_id = family_trips.group_id
      AND fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "service_role_all_payment_transactions" ON public.payment_transactions;
CREATE POLICY "service_role_all_payment_transactions"
ON public.payment_transactions FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can read own payment transactions"
ON public.payment_transactions FOR SELECT TO authenticated
USING (auth.uid()::text = user_id);
