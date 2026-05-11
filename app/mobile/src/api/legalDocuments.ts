import { api } from './client';
import {
  LEGAL_BODY_FALLBACK,
  selectLegalBody,
  type LegalDocDetailRow,
  type PublicLegalSlug,
} from './dto/legal';

export type PublicLegalDocument = {
  title: string;
  body: string;
  row: LegalDocDetailRow;
};

function unwrapLegalRow(data: unknown): LegalDocDetailRow | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as { data?: unknown };
  const row = payload.data ?? data;
  return row && typeof row === 'object' && !Array.isArray(row) ? (row as LegalDocDetailRow) : null;
}

export async function fetchPublicLegalDocument(
  slug: PublicLegalSlug,
  id?: string | null,
): Promise<PublicLegalDocument> {
  const paths = [
    id ? `/api/legal/documents/${encodeURIComponent(id)}` : null,
    `/api/legal/documents/by-slug/${encodeURIComponent(slug)}`,
  ].filter(Boolean) as string[];

  let lastError = 'Document not found';
  for (const path of paths) {
    const res = await api.get(path);
    if (!res.success) {
      lastError = res.error || lastError;
      continue;
    }
    const row = unwrapLegalRow(res.data);
    const body = selectLegalBody(row);
    if (row && body !== LEGAL_BODY_FALLBACK) {
      const title =
        typeof row.name === 'string' && row.name.trim()
          ? row.name.trim()
          : slug === 'privacy-policy'
            ? 'Privacy Policy'
            : 'Terms of Service';
      return { title, body, row };
    }
    lastError = LEGAL_BODY_FALLBACK;
  }

  throw new Error(lastError);
}
