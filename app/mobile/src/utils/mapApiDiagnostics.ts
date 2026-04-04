/**
 * Map-related fetches previously swallowed errors; drivers had no signal when the API failed.
 * Logs always (device / Metro / production log collectors); keeps UI calm (no spam alerts).
 */
function detailToString(detail: unknown): string {
  if (detail === undefined || detail === null) return '';
  if (typeof detail === 'string') return detail;
  if (detail instanceof Error) return detail.message;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function logMapDataIssue(scope: string, detail?: unknown): void {
  const msg = detailToString(detail);
  const suffix = msg ? `: ${msg}` : '';
  // eslint-disable-next-line no-console -- intentional diagnostics for field testing
  console.warn(`[SnapRoad Map] ${scope}${suffix}`);
}
