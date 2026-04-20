export const DEFAULT_BLEND = {
  vFloorMps: 2,
  maxSwingSecPerTick: 8,
} as const;

/**
 * Short-horizon blend of model remaining time with naive distance/speed estimate.
 * `weightModel` rises with confidence, time since model refresh, and (optional) lower speed variance.
 */
export function etaObservedBlendWeight(args: {
  confidence: number;
  msSinceModelRefresh: number;
  /** Optional 0..1 — higher means stabler GPS speed (caller may use EMA variance). */
  speedStability01: number;
}): number {
  const t = Math.max(0, args.msSinceModelRefresh);
  const ageBoost = Math.min(1, t / 120_000);
  const conf = Math.max(0, Math.min(1, args.confidence));
  const stab = Math.max(0, Math.min(1, args.speedStability01));
  const w = 0.28 + 0.5 * conf + 0.22 * ageBoost + 0.12 * stab;
  return Math.max(0, Math.min(1, w));
}

export function naiveRemainingSecFromDistance(
  distanceRemainingM: number,
  smoothedSpeedMps: number,
  vFloorMps: number,
): number {
  const v = Math.max(vFloorMps, smoothedSpeedMps);
  return distanceRemainingM / v;
}

export type BlendEtaArgs = {
  modelRemainingSec: number;
  distanceRemainingM: number;
  smoothedSpeedMps: number;
  confidence: number;
  msSinceModelRefresh: number;
  speedStability01: number;
  prevBlendedSec: number | null;
  dtMs: number;
  vFloorMps?: number;
  maxSwingSecPerTick?: number;
};

export type BlendEtaResult = {
  blendedSec: number;
  naiveSec: number;
  weightModel: number;
};

export function blendModelWithObservedEta(args: BlendEtaArgs): BlendEtaResult {
  const vFloor = args.vFloorMps ?? DEFAULT_BLEND.vFloorMps;
  const cap = args.maxSwingSecPerTick ?? DEFAULT_BLEND.maxSwingSecPerTick;

  const naive = naiveRemainingSecFromDistance(args.distanceRemainingM, args.smoothedSpeedMps, vFloor);
  const w = etaObservedBlendWeight({
    confidence: args.confidence,
    msSinceModelRefresh: args.msSinceModelRefresh,
    speedStability01: args.speedStability01,
  });

  let blended = w * args.modelRemainingSec + (1 - w) * naive;

  const prev = args.prevBlendedSec;
  if (prev != null && Number.isFinite(prev) && args.dtMs > 0) {
    const maxDelta = cap * Math.min(1.5, args.dtMs / 1000);
    blended = Math.max(prev - maxDelta, Math.min(prev + maxDelta, blended));
  }

  blended = Math.max(0, blended);
  return { blendedSec: blended, naiveSec: naive, weightModel: w };
}
