export type ApiResultLike = {
  success: boolean;
  error?: string;
};

export function extractLocationSharingValue(payload: unknown): boolean | null {
  if (!payload || typeof payload !== 'object') return null;
  const top = payload as { data?: unknown; is_sharing?: unknown };
  const inner = (top.data && typeof top.data === 'object' ? top.data : top) as { is_sharing?: unknown };
  return typeof inner.is_sharing === 'boolean' ? inner.is_sharing : null;
}

export function getApiError(res: ApiResultLike, fallback: string): string | null {
  if (res.success) return null;
  return (typeof res.error === 'string' && res.error.trim()) ? res.error : fallback;
}
