import type { CongestionLevel } from '../lib/directions';

export const DEFAULT_REFRESH_POLICY = {
  minCooldownMs: 100_000,
  maxRefreshesPerHour: 16,
  stallSpeedMps: 1.5,
  /** Hard ceiling: prefer refresh by this age even without drift (subject to cooldown). */
  periodicStaleMs: 300_000,
  /** Soft floor between periodic checks when v2 policy is active. */
  policyEvalIntervalMs: 10_000,
  debounceMs: 4500,
  driftGapSec: 120,
  driftSustainMs: 45_000,
  longStepMeters: 8000,
  /** Minutes to upcoming maneuver (distance / speed) to pair with long-step signal. */
  timeToManeuverMaxMin: 12,
  vMinMps: 2,
  poorGpsAccuracyM: 62,
  minNavConfidence: 0.22,
  congestionJumpMinFraction: 0.12,
  /** Severity rank delta that counts as a meaningful jump. */
  congestionJumpMinDelta: 2,
  /** Model speed mismatch: actual speed this far below annotated edge speed (ratio). */
  modelSpeedMismatchRatio: 0.52,
  modelSpeedMismatchSustainMs: 35_000,
  /**
   * When this fraction of **remaining** edges (from snap index) is moderate+ congestion,
   * allow an extra refresh candidate after `congestionStressMinRefreshAgeMs` (single-snapshot heuristic).
   */
  congestionStressMinFraction: 0.42,
  congestionStressMinEdges: 12,
  /** Shorter floor than periodic stale so bad corridors re-query traffic sooner. */
  congestionStressMinRefreshAgeMs: 75_000,
} as const;

export type RouteRefreshPolicyConfig = typeof DEFAULT_REFRESH_POLICY;

export function congestionRank(level: CongestionLevel): number {
  switch (level) {
    case 'low':
      return 1;
    case 'moderate':
      return 2;
    case 'heavy':
      return 3;
    case 'severe':
      return 4;
    default:
      return 0;
  }
}

/** Compact fingerprint for remaining congestion slice (telemetry / comparison). */
export function hashCongestionSlice(congestion: CongestionLevel[] | undefined, fromEdgeIndex: number): string | null {
  if (!congestion?.length) return null;
  const i = Math.max(0, Math.min(fromEdgeIndex, congestion.length - 1));
  return congestion.slice(i).join(',');
}

/**
 * Fraction of overlapping edges where severity increased by at least `minDelta`.
 * Used when comparing two aligned snapshots (e.g. before/after fetch) or hypothetical replay.
 */
export function congestionWorsenedEdgeFraction(
  prev: CongestionLevel[] | undefined,
  curr: CongestionLevel[] | undefined,
  fromIndex: number,
  minDelta: number,
): number | null {
  if (!prev?.length || !curr?.length) return null;
  const n = Math.min(prev.length, curr.length);
  if (fromIndex >= n) return null;
  let worse = 0;
  let total = 0;
  for (let e = fromIndex; e < n; e++) {
    const a = congestionRank(prev[e]!);
    const b = congestionRank(curr[e]!);
    if (a <= 0 || b <= 0) continue;
    total += 1;
    if (b - a >= minDelta) worse += 1;
  }
  if (total === 0) return null;
  return worse / total;
}

export function naiveRemainingSeconds(
  distanceRemainingM: number,
  speedMps: number,
  vMinMps: number,
): number {
  const v = Math.max(vMinMps, speedMps);
  return distanceRemainingM / v;
}

export type RouteRefreshTrigger =
  | 'periodic_stale'
  | 'eta_drift'
  | 'long_segment'
  | 'congestion_delta'
  | 'model_speed_mismatch'
  | 'none';

export type RefreshGateReason = 'stall' | 'reroute' | 'poor_gps' | 'low_confidence';

export function passesRefreshGates(args: {
  speedMps: number;
  rerouteInFlight: boolean;
  gpsAccuracyM: number | null;
  navConfidence: number;
  stallSpeedMps: number;
  poorGpsAccuracyM: number;
  minNavConfidence: number;
}): { ok: true } | { ok: false; reason: RefreshGateReason } {
  if (args.rerouteInFlight) return { ok: false, reason: 'reroute' };
  if (args.speedMps < args.stallSpeedMps) return { ok: false, reason: 'stall' };
  if (typeof args.gpsAccuracyM === 'number' && args.gpsAccuracyM > args.poorGpsAccuracyM) {
    return { ok: false, reason: 'poor_gps' };
  }
  if (args.navConfidence < args.minNavConfidence) return { ok: false, reason: 'low_confidence' };
  return { ok: true };
}

export function countRefreshesSince(refreshHistoryMs: readonly number[], nowMs: number, windowMs: number): number {
  const cutoff = nowMs - windowMs;
  let c = 0;
  for (const t of refreshHistoryMs) {
    if (t >= cutoff) c += 1;
  }
  return c;
}

export function congestionDeltaTrigger(args: {
  baseline: CongestionLevel[] | undefined;
  current: CongestionLevel[] | undefined;
  fromEdgeIndex: number;
  minFraction: number;
  minDelta: number;
}): boolean {
  const frac = congestionWorsenedEdgeFraction(args.baseline, args.current, args.fromEdgeIndex, args.minDelta);
  return frac != null && frac >= args.minFraction;
}

/**
 * True when the remaining route slice (from `fromEdgeIndex`) is mostly moderate/heavy/severe.
 * Uses one Directions snapshot; paired with a minimum age since last refresh to avoid spam.
 */
export function remainingCongestionStressTrigger(args: {
  congestion: CongestionLevel[] | undefined;
  fromEdgeIndex: number;
  minModerateOrHigherFraction: number;
  minEdges: number;
}): boolean {
  if (!args.congestion?.length) return false;
  const i = Math.max(0, Math.min(args.fromEdgeIndex, args.congestion.length - 1));
  const slice = args.congestion.slice(i);
  if (slice.length < args.minEdges) return false;
  let stressed = 0;
  for (const c of slice) {
    if (congestionRank(c) >= 2) stressed += 1;
  }
  return stressed / slice.length >= args.minModerateOrHigherFraction;
}

/** Long highway-style step: big step geometry with maneuver still several minutes out. */
export function longSegmentTrigger(args: {
  currentStepLengthM: number;
  nextStepDistanceMeters: number;
  speedMps: number;
  longStepMeters: number;
  timeToManeuverMaxMin: number;
  vMinMps: number;
}): boolean {
  if (args.currentStepLengthM < args.longStepMeters) return false;
  const v = Math.max(args.vMinMps, args.speedMps);
  const tMin = args.nextStepDistanceMeters / v / 60;
  return tMin > 0 && tMin <= args.timeToManeuverMaxMin;
}

export function modelSpeedMismatchTrigger(args: {
  edgeSpeedsKmh: (number | null)[] | undefined;
  snapSegmentIndex: number;
  congestion: CongestionLevel[] | undefined;
  userSpeedKmh: number;
  ratio: number;
  sustainMs: number;
  sustainThresholdMs: number;
}): boolean {
  if (!args.edgeSpeedsKmh?.length || !args.congestion?.length) return false;
  const i = Math.max(0, Math.min(args.snapSegmentIndex, args.edgeSpeedsKmh.length - 1));
  const expected = args.edgeSpeedsKmh[i];
  if (typeof expected !== 'number' || !Number.isFinite(expected) || expected < 12) return false;
  const sev = congestionRank(args.congestion[Math.min(i, args.congestion.length - 1)]!);
  if (sev < 2) return false;
  return args.userSpeedKmh < expected * args.ratio && args.sustainMs >= args.sustainThresholdMs;
}

export type RefreshCandidate = {
  trigger: RouteRefreshTrigger;
};

/**
 * Choose the strongest refresh candidate from passive signals (no cooldown / hourly cap here).
 *
 * Priority: periodic_stale → congestion_delta (stress heuristic) → eta_drift → long_segment → model_speed_mismatch.
 */
export function pickRefreshCandidate(args: {
  nowMs: number;
  lastRefreshAtMs: number;
  periodicStaleMs: number;
  driftSustainMs: number;
  driftSustainThresholdMs: number;
  driftGapSec: number;
  modelRemainingSec: number;
  distanceRemainingM: number;
  speedMps: number;
  vMinMps: number;
  currentStepLengthM: number;
  nextStepDistanceMeters: number;
  longStepMeters: number;
  timeToManeuverMaxMin: number;
  snapSegmentIndex: number;
  congestionCurrent: CongestionLevel[] | undefined;
  edgeSpeedsKmh: (number | null)[] | undefined;
  edgeMismatchSustainMs: number;
  modelSpeedMismatchSustainMs: number;
  userSpeedKmh: number;
  modelSpeedMismatchRatio: number;
  congestionStressMinFraction: number;
  congestionStressMinEdges: number;
  congestionStressMinRefreshAgeMs: number;
}): RefreshCandidate | null {
  if (args.nowMs - args.lastRefreshAtMs >= args.periodicStaleMs) {
    return { trigger: 'periodic_stale' };
  }

  if (
    args.nowMs - args.lastRefreshAtMs >= args.congestionStressMinRefreshAgeMs &&
    remainingCongestionStressTrigger({
      congestion: args.congestionCurrent,
      fromEdgeIndex: args.snapSegmentIndex,
      minModerateOrHigherFraction: args.congestionStressMinFraction,
      minEdges: args.congestionStressMinEdges,
    })
  ) {
    return { trigger: 'congestion_delta' };
  }

  const naive = naiveRemainingSeconds(args.distanceRemainingM, args.speedMps, args.vMinMps);
  const gap = Math.abs(args.modelRemainingSec - naive);
  if (gap >= args.driftGapSec && args.driftSustainMs >= args.driftSustainThresholdMs) {
    return { trigger: 'eta_drift' };
  }

  if (
    longSegmentTrigger({
      currentStepLengthM: args.currentStepLengthM,
      nextStepDistanceMeters: args.nextStepDistanceMeters,
      speedMps: args.speedMps,
      longStepMeters: args.longStepMeters,
      timeToManeuverMaxMin: args.timeToManeuverMaxMin,
      vMinMps: args.vMinMps,
    })
  ) {
    return { trigger: 'long_segment' };
  }

  if (
    modelSpeedMismatchTrigger({
      edgeSpeedsKmh: args.edgeSpeedsKmh,
      snapSegmentIndex: args.snapSegmentIndex,
      congestion: args.congestionCurrent,
      userSpeedKmh: args.userSpeedKmh,
      ratio: args.modelSpeedMismatchRatio,
      sustainMs: args.edgeMismatchSustainMs,
      sustainThresholdMs: args.modelSpeedMismatchSustainMs,
    })
  ) {
    return { trigger: 'model_speed_mismatch' };
  }

  return null;
}

export type TrafficRefreshDecision =
  | { action: 'refresh'; trigger: RouteRefreshTrigger }
  | { action: 'skip'; reason: 'no_candidate' | 'cooldown' | 'hourly_cap' | RefreshGateReason }
  | { action: 'skip'; reason: 'debounced' };

/**
 * Apply cooldown, hourly cap, debounce, and movement gates to a candidate refresh.
 */
export function decideTrafficRefresh(args: {
  nowMs: number;
  lastRefreshAtMs: number;
  lastDebouncedAttemptMs: number;
  refreshHistoryMs: readonly number[];
  candidate: RefreshCandidate | null;
  gates: ReturnType<typeof passesRefreshGates>;
  minCooldownMs: number;
  maxRefreshesPerHour: number;
  debounceMs: number;
}): TrafficRefreshDecision {
  const gate = args.gates;
  if (gate.ok === false) return { action: 'skip', reason: gate.reason };

  if (!args.candidate) return { action: 'skip', reason: 'no_candidate' };

  if (args.nowMs - args.lastDebouncedAttemptMs < args.debounceMs) {
    return { action: 'skip', reason: 'debounced' };
  }

  if (args.nowMs - args.lastRefreshAtMs < args.minCooldownMs) {
    return { action: 'skip', reason: 'cooldown' };
  }

  const n = countRefreshesSince(args.refreshHistoryMs, args.nowMs, 3600_000);
  if (n >= args.maxRefreshesPerHour) {
    return { action: 'skip', reason: 'hourly_cap' };
  }

  return { action: 'refresh', trigger: args.candidate.trigger };
}

/** Sustained drift accumulator (call on each policy tick). */
export function updateDriftSustained(
  prevMs: number,
  nowMs: number,
  lastTickMs: number,
  gapSec: number,
  thresholdSec: number,
): number {
  const dt = Math.max(0, nowMs - lastTickMs);
  if (gapSec >= thresholdSec) return prevMs + dt;
  return 0;
}

export function updateMismatchSustained(
  prevMs: number,
  nowMs: number,
  lastTickMs: number,
  active: boolean,
): number {
  const dt = Math.max(0, nowMs - lastTickMs);
  if (active) return prevMs + dt;
  return 0;
}
