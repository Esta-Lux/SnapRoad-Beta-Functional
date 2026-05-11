-- Stable identifier for legal documents so the public web (/terms, /privacy) and
-- mobile app can fetch them by name without depending on UUIDs that change per
-- environment. UUID lookups still work via /api/legal/documents/{id}.

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Partial unique index so multiple legacy rows without a slug coexist while we
-- migrate, but new slugged rows must be unique. `terms-of-service`,
-- `privacy-policy`, etc.
CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_slug_uniq
  ON public.legal_documents (slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.legal_documents.slug IS
  'Stable identifier (e.g. terms-of-service, privacy-policy) used by /api/legal/documents/by-slug/* and the public website.';
