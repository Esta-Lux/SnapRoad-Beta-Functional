-- Atomic offer redemption: verify offer, profile balance, insert redemption, debit gems,
-- append wallet_transactions, bump offer + partner aggregates in one transaction.
-- Requires: public.offers, public.profiles, public.redemptions, public.wallet_transactions, public.partners
-- Run after 037_wallet_transactions.sql

CREATE OR REPLACE FUNCTION public.redeem_offer_atomic(
  p_user_id uuid,
  p_offer_id text,
  p_fee_amount double precision,
  p_fee_cents integer,
  p_fee_tier integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer RECORD;
  v_prof RECORD;
  v_gem_cost int;
  v_discount int;
  v_is_premium boolean;
  v_redemption_id uuid;
  v_bal_before int;
  v_bal_after int;
  v_now timestamptz := NOW();
  v_oid text;
BEGIN
  IF p_user_id IS NULL OR p_offer_id IS NULL OR TRIM(p_offer_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  SELECT o.* INTO v_offer
  FROM public.offers o
  WHERE o.id::text = TRIM(p_offer_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_not_found');
  END IF;

  IF COALESCE(v_offer.status, 'active') IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_inactive');
  END IF;

  IF v_offer.expires_at IS NOT NULL AND v_offer.expires_at < v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_expired');
  END IF;

  v_gem_cost := COALESCE(
    NULLIF(v_offer.base_gems, 0),
    NULLIF(v_offer.gem_cost, 0),
    NULLIF(v_offer.gems_reward, 0),
    25
  )::int;
  IF v_gem_cost < 1 THEN
    v_gem_cost := 1;
  END IF;

  SELECT p.* INTO v_prof
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_bal_before := COALESCE(v_prof.gems, 0)::int;

  v_is_premium := COALESCE(v_prof.is_premium, FALSE)
    OR LOWER(COALESCE(v_prof.plan::text, '')) IN ('premium', 'family');

  IF v_is_premium THEN
    v_discount := COALESCE(
      v_offer.premium_discount_percent,
      v_offer.discount_percent,
      0
    )::int;
  ELSE
    v_discount := COALESCE(
      v_offer.free_discount_percent,
      GREATEST(1, ROUND(COALESCE(v_offer.discount_percent, 0) * 0.3)::int)
    )::int;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.redemptions r
    WHERE r.user_id = p_user_id AND r.offer_id::text = v_offer.id::text
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  IF v_bal_before < v_gem_cost THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_gems',
      'gem_cost', v_gem_cost,
      'current_gems', v_bal_before
    );
  END IF;

  v_oid := v_offer.id::text;

  INSERT INTO public.redemptions (
    offer_id,
    user_id,
    partner_id,
    gems_earned,
    discount_applied,
    fee_amount,
    fee_cents,
    fee_tier,
    status,
    redeemed_at
  ) VALUES (
    v_offer.id,
    p_user_id,
    v_offer.partner_id,
    -v_gem_cost,
    v_discount::double precision,
    COALESCE(p_fee_amount, 0)::double precision,
    COALESCE(p_fee_cents, 0),
    COALESCE(p_fee_tier, 1),
    'verified',
    v_now
  )
  RETURNING id INTO v_redemption_id;

  UPDATE public.profiles
  SET gems = COALESCE(gems, 0) - v_gem_cost
  WHERE id = p_user_id AND COALESCE(gems, 0) >= v_gem_cost
  RETURNING gems INTO v_bal_after;

  IF v_bal_after IS NULL THEN
    DELETE FROM public.redemptions WHERE id = v_redemption_id;
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_gems');
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id,
    tx_type,
    direction,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    status,
    metadata
  ) VALUES (
    p_user_id,
    'offer_redeem',
    'debit',
    v_gem_cost,
    v_bal_before,
    v_bal_after,
    'redemption',
    v_redemption_id::text,
    'posted',
    jsonb_build_object(
      'offer_id', v_oid,
      'gem_cost', v_gem_cost,
      'fee_cents', COALESCE(p_fee_cents, 0)
    )
  );

  UPDATE public.offers
  SET redemption_count = COALESCE(redemption_count, 0) + 1
  WHERE id = v_offer.id;

  IF v_offer.partner_id IS NOT NULL THEN
    UPDATE public.partners
    SET
      total_redemptions = COALESCE(total_redemptions, 0) + 1,
      total_fees_owed = COALESCE(total_fees_owed, 0) + COALESCE(p_fee_amount, 0)::double precision
    WHERE id = v_offer.partner_id;
  END IF;

    RETURN jsonb_build_object(
    'ok', true,
    'redemption_id', v_redemption_id::text,
    'gem_cost', v_gem_cost,
    'discount_percent', v_discount,
    'gems_earned', -v_gem_cost,
    'new_gem_total', v_bal_after,
    'redeemed_at', v_now::text
  );
END;
$$;

COMMENT ON FUNCTION public.redeem_offer_atomic IS 'Single-transaction driver offer redeem; caller should run record_redemption_fee after success for monthly fee ledger.';

-- PostgREST / service role (Supabase backend uses service_role)
GRANT EXECUTE ON FUNCTION public.redeem_offer_atomic(uuid, text, double precision, integer, integer) TO service_role;
