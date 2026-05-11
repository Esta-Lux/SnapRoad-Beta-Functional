/**
 * Legal-document DTOs and helpers shared by `LegalConsentGate` and the
 * profile screen's `AboutCard`.
 *
 * The backend stores legal-doc bodies as full HTML so the public website can
 * render them with rich formatting; on read it derives a plain-text mirror in
 * a `content_text` field. This module owns the fallback chain so both
 * mobile consumers stay in sync — and so we can unit-test the priority order
 * (`content_text` → `content` → legacy fields → empty placeholder).
 */

export type LegalDocSummary = {
  id: string;
  slug?: string | null;
  name: string;
  type?: string;
  description?: string;
};

export type PublicLegalSlug = 'privacy-policy' | 'terms-of-service';

export function normalizeLegalSlug(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
    : '';
}

export function publicLegalSlugForDoc(row: Pick<LegalDocSummary, 'slug' | 'name' | 'type'>): PublicLegalSlug | null {
  const slug = normalizeLegalSlug(row.slug);
  const type = normalizeLegalSlug(row.type);
  const name = normalizeLegalSlug(row.name);
  const hay = `${slug} ${type} ${name}`;
  if (hay.includes('cookie') || hay.includes('api-terms') || hay.includes('developer') || hay.includes('partner')) {
    return null;
  }
  if (slug === 'privacy-policy' || name === 'privacy-policy' || type === 'privacy') return 'privacy-policy';
  if (slug === 'terms-of-service' || slug === 'terms' || name === 'terms-of-service' || name === 'terms' || type === 'terms') {
    return 'terms-of-service';
  }
  return null;
}

export type LegalDocDetailRow = Partial<{
  /** Server-derived plain-text mirror of `content` — preferred on mobile. */
  content_text: string;
  /** Raw HTML body as authored in the admin portal. */
  content: string;
  /** Legacy aliases kept for older API responses. */
  body: string;
  text: string;
  description: string;
}> & Record<string, unknown>;

export const LEGAL_BODY_FALLBACK =
  'No text has been published for this document yet. Ask your admin to publish content in the Legal & Compliance tab.';

/**
 * Resolve the body string to render for a legal document.
 *
 * Priority order:
 *   1. `content_text` — server-stripped plain text, optimised for `<Text>`
 *      rendering on React Native (no raw `<p>` / `<ul>` / etc.).
 *   2. `content` — the original HTML; used as a fallback for older API
 *      revisions that don't yet emit `content_text`. Mobile renders it as
 *      raw text, but at least the words are there.
 *   3. `body` / `text` / `description` — historical aliases.
 *
 * Returns the placeholder string when nothing is published so the UI shows
 * actionable copy instead of an empty modal.
 */
export function selectLegalBody(row: LegalDocDetailRow | null | undefined): string {
  if (!row) return LEGAL_BODY_FALLBACK;
  const candidates = [row.content_text, row.content, row.body, row.text, row.description];
  for (const value of candidates) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return LEGAL_BODY_FALLBACK;
}
