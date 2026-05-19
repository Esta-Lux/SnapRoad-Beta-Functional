import type { OrionDriveContext } from './types';

export function firstName(userName: string | null): string {
  const name = (userName ?? '').trim().split(/\s+/)[0] ?? '';
  return name.length > 0 && name.length <= 16 ? name : '';
}

export function fillDialogueTemplate(template: string, ctx: OrionDriveContext): string {
  const dest = ctx.destination?.trim() || 'your destination';
  const road = ctx.currentRoad?.trim() || 'the road';
  const traffic = ctx.trafficLevel === 'unknown' ? 'traffic' : ctx.trafficLevel;
  const mode = ctx.drivingMode?.trim() || 'adaptive';
  const eta =
    ctx.etaMinutes != null && Number.isFinite(ctx.etaMinutes)
      ? String(Math.max(1, Math.round(ctx.etaMinutes)))
      : 'a few';
  const dist =
    ctx.distanceMiles != null && Number.isFinite(ctx.distanceMiles)
      ? ctx.distanceMiles.toFixed(1)
      : 'some';
  const gems = String(Math.max(0, Math.round(ctx.gemsEarnedThisTrip || ctx.gemsEarned)));
  const mins = String(Math.max(0, Math.round(ctx.driveDurationMinutes)));
  const name = firstName(ctx.userName);

  let out = template
    .replaceAll('{{destination}}', dest)
    .replaceAll('{{currentRoad}}', road)
    .replaceAll('{{etaMinutes}}', eta)
    .replaceAll('{{distanceMiles}}', dist)
    .replaceAll('{{gemsEarnedThisTrip}}', gems)
    .replaceAll('{{gemsEarned}}', gems)
    .replaceAll('{{driveDurationMinutes}}', mins)
    .replaceAll('{{userName}}', name || 'there')
    .replaceAll('{{weather}}', ctx.weather?.trim() || 'clear skies')
    .replaceAll('{{trafficLevel}}', traffic)
    .replaceAll('{{timeOfDay}}', ctx.timeOfDay)
    .replaceAll('{{drivingMode}}', mode);

  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

export function truncateToMaxWords(text: string, maxWords: number): string {
  if (maxWords <= 0) return '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  const cut = words.slice(0, maxWords).join(' ');
  return /[.!?]$/.test(cut) ? cut : `${cut}.`;
}

export function normalizeMessageKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}
