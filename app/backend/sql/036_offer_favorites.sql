-- Per-user saved offers (heart / favorite). Backend uses service role; RLS protects direct client access.
-- Run in Supabase SQL Editor after public.offers exists.
-- Requires offers.id compatible with INTEGER (see supabase_migration.sql SERIAL offers).
-- Numbered 036 because 035_referral_milestones.sql ships referral tables first.

CREATE TABLE IF NOT EXISTS public.offer_favorites (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  offer_id INTEGER NOT NULL REFERENCES public.offers (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, offer_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_favorites_user_id ON public.offer_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_offer_favorites_offer_id ON public.offer_favorites (offer_id);

ALTER TABLE public.offer_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own offer favorites" ON public.offer_favorites;
CREATE POLICY "Users manage own offer favorites"
  ON public.offer_favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
