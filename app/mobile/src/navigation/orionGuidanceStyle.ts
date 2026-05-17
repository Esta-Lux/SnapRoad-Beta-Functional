import type { NavStep } from './navModel';

export type GuidanceBucket = 'preparatory' | 'advance' | 'imminent';

type OrionGuidanceContext = {
  bucket: GuidanceBucket;
  step: NavStep;
  distanceMeters: number;
};

function enabled(): boolean {
  const raw = String(process.env.EXPO_PUBLIC_ORION_NAV_BUDDY ?? '1').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

function deterministicIndex(seed: string, length: number): number {
  if (length <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function buddyTail(ctx: OrionGuidanceContext): string {
  if (ctx.bucket === 'imminent') return '';

  const routeMemoryHint =
    ctx.bucket === 'preparatory' &&
    ctx.distanceMeters < 1200 &&
    (ctx.step.kind.includes('ramp') || ctx.step.kind.includes('fork'));

  const candidates = routeMemoryHint
    ? [
        'Stay with me on this one.',
        'No sequel to the missed-exit saga today.',
        'This is the one we want.',
      ]
    : [
        'Smooth and easy.',
        'You got this.',
        'Clean line, no drama.',
        'I like this move for us.',
      ];

  return candidates[deterministicIndex(`${ctx.step.index}:${ctx.step.kind}:${ctx.bucket}`, candidates.length)] ?? '';
}

export function orionizeNavigationUtterance(base: string, ctx: OrionGuidanceContext): string {
  const clean = base.trim();
  if (!enabled() || !clean) return clean;
  if (ctx.bucket === 'imminent') return clean;

  const tail = buddyTail(ctx);
  if (!tail) return clean;
  return `${clean.replace(/\s+$/, '').replace(/[.?!]$/, '')}. ${tail}`;
}
