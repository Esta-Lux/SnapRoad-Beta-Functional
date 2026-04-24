import type { NavStep, NavigationProgress } from './navModel';

/**
 * Buckets distance to the next maneuver for turn-card *identity* (not the live label).
 * When only meters tick within a bucket, a stable `NavigationProgress` reference can be
 * reused so React does not re-render the turn card every progress sample.
 */
function metersToGuidanceDisplayBucket(m: number | undefined | null): string {
  if (typeof m !== 'number' || !Number.isFinite(m)) return 'n';
  if (m > 200) return `a${Math.floor(m / 20) * 20}`;
  if (m > 50) return `b${Math.floor(m / 10) * 10}`;
  if (m > 10) return `c${Math.floor(m / 5) * 5}`;
  return `d${Math.max(0, Math.floor(m))}`;
}

/**
 * Signature of turn-relevant guidance for headless-SDK: changes when the driver should
 * see a *different* turn card (maneuver copy, type, or display bucket) — not when only
 * fraction / along-route position updates.
 */
export function sdkGuidanceUiSignature(np: NavigationProgress): string {
  if (np.instructionSource === 'js') return 'js';
  if (np.instructionSource === 'sdk_waiting') {
    return `sw|${(np.banner?.primaryInstruction ?? '').replace(/\s+/g, ' ').trim()}`;
  }
  if (np.instructionSource !== 'sdk') return `o|${np.instructionSource}`;
  const id = np.nativeStepIdentity;
  const leg = id?.legIndex ?? 0;
  const step = id?.stepIndex ?? 0;
  const b = np.banner;
  const n = np.nextStep;
  const p = (b?.primaryInstruction ?? '').replace(/\s+/g, ' ').trim();
  const s = (b?.secondaryInstruction ?? '').replace(/\s+/g, ' ').trim();
  const dBucket = metersToGuidanceDisplayBucket(np.nextStepDistanceMeters);
  const rawT = n?.rawType ?? '';
  const rawM = n?.rawModifier ?? '';
  return `sdk|${leg}|${step}|${p}|${s}|${rawT}|${rawM}|${dBucket}`;
}

/**
 * Stable key for `useStableText` + turn-card step identity on headless-SDK sessions.
 *
 * **Do not** fold in `banner.primaryInstruction` or any native display string. The bridge
 * can re-emit the same step with small wording, whitespace, or field-source changes
 * every progress tick. Including those strings in the key resets dwell logic every frame.
 *
 * Include **leg** + **step** so a new leg (step index can restart at 0) does not look like
 * the same maneuver; that mismatch caused “late” card updates vs native.
 */
export function sdkGuidanceStabilityKey(
  next: NavStep | null | undefined,
  legIndex?: number | null,
): string {
  const leg = legIndex ?? 0;
  return `sdk|leg:${leg}|step:${next?.index ?? 0}`;
}
