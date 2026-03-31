-- Pre-launch integrity constraints for rewards/payments/photo-upvotes
-- Run in Supabase SQL editor.

-- 1) Persist payment transaction records used by /api/payments/*
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  plan_id TEXT,
  plan_name TEXT,
  amount NUMERIC(12,2),
  currency TEXT,
  user_id TEXT,
  user_email TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
  ON public.payment_transactions(created_at DESC);

-- 2) Enforce one redemption per user per offer (idempotency safety net)
DO $$
DECLARE
  target_table text;
  user_col text;
BEGIN
  -- Support both legacy schemas:
  --  - public.redemptions (user_id OR profile_id)
  --  - public.offer_redemptions (user_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'redemptions'
  ) THEN
    target_table := 'redemptions';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'offer_redemptions'
  ) THEN
    target_table := 'offer_redemptions';
  ELSE
    target_table := NULL;
  END IF;

  IF target_table IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=target_table AND column_name='user_id'
    ) THEN
      user_col := 'user_id';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=target_table AND column_name='profile_id'
    ) THEN
      user_col := 'profile_id';
    ELSE
      user_col := NULL;
    END IF;

    IF user_col IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=target_table AND column_name='offer_id'
    ) THEN
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_%s_user_offer_unique ON public.%I(%I, offer_id)',
        target_table,
        target_table,
        user_col
      );
    END IF;
  END IF;
END
$$;

-- 3) Enforce one upvote per user per photo report
CREATE TABLE IF NOT EXISTS public.incident_photo_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.incident_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_photo_upvotes_report
  ON public.incident_photo_upvotes(report_id);

ALTER TABLE public.incident_photo_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own photo upvotes" ON public.incident_photo_upvotes;
CREATE POLICY "Users can read own photo upvotes"
ON public.incident_photo_upvotes FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own photo upvotes" ON public.incident_photo_upvotes;
CREATE POLICY "Users can create own photo upvotes"
ON public.incident_photo_upvotes FOR INSERT
WITH CHECK (auth.uid() = user_id);
