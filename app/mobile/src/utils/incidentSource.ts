import type { Incident } from '../types';

export function isProviderTrafficIncident(inc: Incident): boolean {
  const src = String(inc.source ?? inc.provider ?? '').toLowerCase();
  if (src === 'tomtom' || src === 'osm') return true;
  const id = String(inc.id ?? '');
  return id.startsWith('tomtom-') || Boolean(inc.verified && src !== 'snaproad');
}

export function formatDelayLabel(delaySeconds?: number): string | null {
  if (delaySeconds == null || delaySeconds <= 0) return null;
  const mins = Math.max(1, Math.round(delaySeconds / 60));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `+${h}h ${m}m` : `+${h}h`;
  }
  return `+${mins} min`;
}
