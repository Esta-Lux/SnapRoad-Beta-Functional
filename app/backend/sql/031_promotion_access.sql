-- Time-boxed promotions for drivers and partners (admin-granted free access).
-- App treats active rows as premium / active subscription until promotion_access_until.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS promotion_access_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promotion_plan TEXT;

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS promotion_access_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promotion_plan TEXT;
