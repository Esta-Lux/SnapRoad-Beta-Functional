import type { NavStep } from './navModel';

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
