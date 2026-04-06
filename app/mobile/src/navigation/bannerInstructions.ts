import type { DirectionsStep } from '../lib/directions';

type StepLike = DirectionsStep | null | undefined;
type CardState = 'preview' | 'active' | 'confirm' | 'cruise';

export function getPrimaryBannerText(step: StepLike): string {
  const banner = step?.bannerInstructions?.[0];
  return banner?.primary?.text || step?.instruction || '';
}

export function getSecondaryBannerText(step: StepLike): string | null {
  const banner = step?.bannerInstructions?.[0];
  return banner?.secondary?.text || null;
}

export function getSubBannerText(step: StepLike): string | null {
  const banner = step?.bannerInstructions?.[0];
  if (!banner?.sub) return null;

  const hasLaneComponents =
    Array.isArray(banner.sub.components) &&
    banner.sub.components.some((c) => c?.type === 'lane');

  if (hasLaneComponents) return null;
  return banner.sub.text || null;
}

export function getLaneData(step: StepLike): string | undefined {
  const banner = step?.bannerInstructions?.[0];
  const sub = banner?.sub;
  const laneComponents = Array.isArray(sub?.components)
    ? sub.components.filter((c) => c?.type === 'lane')
    : [];

  if (laneComponents.length > 0) {
    const lanes = laneComponents.map((c) => ({
      indications: Array.isArray(c.directions) ? c.directions : [],
      valid: !!c.active,
    }));
    return JSON.stringify(lanes);
  }

  return step?.lanes;
}

/** Sub / secondary for “then” row: banner first, else null (caller merges turnCardModel secondary). */
export function getBannerThenLine(step: StepLike): string | null {
  return getSubBannerText(step) || getSecondaryBannerText(step);
}

/**
 * Mapbox often puts banner + lane components on the step for the *upcoming* maneuver, but sometimes
 * on the prior “continue” step — pick the richest step so icons/lanes match the polyline step index.
 */
export function pickGuidanceStep(
  cardState: CardState,
  current: StepLike,
  next: StepLike,
): DirectionsStep | null | undefined {
  if (cardState === 'confirm') return current ?? undefined;
  const n = next;
  const c = current;
  if (n?.bannerInstructions?.length) return n;
  if (getLaneData(n)) return n;
  if (c?.bannerInstructions?.length && (c.maneuver === 'straight' || c.maneuver === 'depart')) return c;
  if (getLaneData(c)) return c;
  return n ?? c;
}

/** First non-empty lane JSON from Mapbox banner sub-components or step.lanes. */
export function mergeLaneSources(...candidates: StepLike[]): string | undefined {
  for (const s of candidates) {
    const fromBanner = getLaneData(s);
    if (fromBanner) return fromBanner;
    if (s?.lanes && s.lanes.length > 2) return s.lanes;
  }
  return undefined;
}
