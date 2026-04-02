ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token_platform TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;
