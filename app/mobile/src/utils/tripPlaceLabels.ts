/**
 * Human-readable trip endpoints for trip summary + history.
 * Server stores up to 160 chars on `trips.origin` / `trips.destination`.
 */
export function formatTripPlaceLabel(
  parts: { name?: string | null; address?: string | null },
  fallback: string,
): string {
  const n = (parts.name ?? '').trim();
  const a = (parts.address ?? '').trim();
  if (n && a) {
    const same = n.toLowerCase() === a.toLowerCase();
    if (same) return n.slice(0, 160);
    if (a.includes(n) || n.includes(a)) return (n.length >= a.length ? n : a).slice(0, 160);
    const combined = `${n} · ${a}`;
    return combined.length <= 160 ? combined : `${n.slice(0, 77)} · ${a.slice(0, 77)}`;
  }
  if (n) return n.slice(0, 160);
  if (a) return a.slice(0, 160);
  return fallback;
}
