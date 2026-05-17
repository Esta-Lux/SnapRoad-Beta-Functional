import type { NavStep } from './navModel';
import type { DrivingMode } from '../types';

export type GuidanceBucket = 'preparatory' | 'advance' | 'imminent';

type OrionGuidanceContext = {
  bucket: GuidanceBucket;
  step: NavStep;
  distanceMeters: number;
  drivingMode?: DrivingMode;
  userName?: string;
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

  const name = (ctx.userName || '').trim().split(/\s+/)[0];
  const friendlyName = name && name.length <= 16 ? `, ${name}` : '';
  const routeMemoryHint =
    ctx.bucket === 'preparatory' &&
    ctx.distanceMeters < 1200 &&
    (ctx.step.kind.includes('ramp') || ctx.step.kind.includes('fork'));
  const turnHint = ctx.step.kind.includes('left') || ctx.step.kind.includes('right');
  const sport = ctx.drivingMode === 'sport';
  const calm = ctx.drivingMode === 'calm';

  let candidates = routeMemoryHint
    ? [
        `Stay with me on this one${friendlyName}.`,
        'No sequel to the missed-exit saga today.',
        'This is the one we want. Plot twist: we take it.',
      ]
    : turnHint
      ? [
          `Clean turn${friendlyName}. Very limited edition.`,
          'Tiny road win. Collecting those like gems.',
          'That lane choice has main-character energy.',
          'Smooth turn, zero drama. My favorite genre.',
        ]
      : [
          'Smooth and easy.',
          'You got this.',
          'Clean line, no drama.',
          'I like this move for us.',
        ];

  if (sport) {
    candidates = [
      ...candidates,
      'Sport mode approves. Responsibly, obviously.',
      'Crisp move. Very premium, very legal.',
    ];
  } else if (calm) {
    candidates = [
      ...candidates,
      'Calm mode: smooth like butter, but with seatbelts.',
      'Easy does it. The road loves emotional maturity.',
    ];
  }

  const safeDadJokes = [
    'I tried to make a road joke, but it went nowhere.',
    'That turn was acute one.',
    'Navigation puns? I route for them.',
  ];

  const pool = ctx.bucket === 'advance' ? [...candidates, ...safeDadJokes] : candidates;

  return pool[deterministicIndex(`${ctx.step.index}:${ctx.step.kind}:${ctx.bucket}:${ctx.drivingMode ?? ''}`, pool.length)] ?? '';
}

export function orionizeNavigationUtterance(base: string, ctx: OrionGuidanceContext): string {
  const clean = base.trim();
  if (!enabled() || !clean) return clean;
  if (ctx.bucket === 'imminent') return clean;

  const tail = buddyTail(ctx);
  if (!tail) return clean;
  return `${clean.replace(/\s+$/, '').replace(/[.?!]$/, '')}. ${tail}`;
}
