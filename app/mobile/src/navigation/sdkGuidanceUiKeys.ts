import type { NavStep } from './navModel';

/**
 * Stable key for `useStableText` + maneuver-distance hold on headless-SDK sessions.
 *
 * **Do not** fold in `banner.primaryInstruction` or any native display string. The bridge
 * can re-emit the same step with small wording, whitespace, or field-source changes
 * every progress tick. Including those strings in the key resets the 960ms text dwell
 * and distance smoother on every frame → turn card + strip flicker, repeated “depart”
 * phrasing, and fighting native TTS.
 *
 * The route step `index` advancing (or a true maneuver identity change) is the right
 * moment to reset; that is a new guidance moment.
 */
export function sdkGuidanceStabilityKey(next: NavStep | null | undefined): string {
  return `sdk|${next?.index ?? 0}`;
}
