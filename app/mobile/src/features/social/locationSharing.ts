export type ApiResultLike = {
  success: boolean;
  error?: string;
};

export function extractLocationSharingValue(payload: unknown): boolean | null {
  if (!payload || typeof payload !== 'object') return null;
  const top = payload as { data?: unknown; is_sharing?: unknown };
  if (typeof top.is_sharing === 'boolean') return top.is_sharing;
  if (!top.data || typeof top.data !== 'object') return null;
  const nested = top.data as { is_sharing?: unknown };
  return typeof nested.is_sharing === 'boolean' ? nested.is_sharing : null;
}

export function getApiErrorMessage(res: ApiResultLike, fallback: string): string | null {
  if (res.success) return null;
  return (typeof res.error === 'string' && res.error.trim()) ? res.error : fallback;
}
