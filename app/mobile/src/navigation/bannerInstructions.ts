import type { DirectionsStep } from '../lib/directions';
import type { LaneInfo, LaneIndication } from './navModel';
import { parseLaneIndication } from './laneIndication';

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

export function isActionableGuidanceStep(step: StepLike, allowArrival = false): boolean {
  if (!step || !Number.isFinite(step.lat) || !Number.isFinite(step.lng)) return false;
  if (step.maneuver === 'depart') return false;
  if (step.maneuver === 'arrive') return allowArrival;
  if (step.maneuver === 'straight') return !!getLaneData(step);
  return true;
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
  if (isActionableGuidanceStep(n, true) && n?.bannerInstructions?.length) return n;
  if (isActionableGuidanceStep(n, true) && getLaneData(n)) return n;
  if (isActionableGuidanceStep(c, true) && c?.bannerInstructions?.length) return c;
  if (isActionableGuidanceStep(c, true) && getLaneData(c)) return c;
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

/**
 * Parse legacy lane JSON from {@link getLaneData} / {@link mergeLaneSources} into {@link LaneInfo}.
 */
export function lanesFromLegacyJson(json: string | undefined | null): LaneInfo[] | null {
  if (!json || typeof json !== 'string' || json.length < 2) return null;
  try {
    const arr = JSON.parse(json) as Array<{
      indications?: string[];
      directions?: string[];
      valid?: boolean;
      active?: boolean;
      valid_indication?: string;
      validIndication?: string;
    }>;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((lane) => {
      const rawDirs = lane.indications ?? lane.directions ?? [];
      const indications = rawDirs.map((d) => parseLaneIndication(String(d)));
      const viRaw = lane.valid_indication ?? lane.validIndication;
      const displayIndication: LaneIndication = viRaw
        ? parseLaneIndication(String(viRaw))
        : indications[0] ?? 'straight';
      const active = Boolean(lane.valid ?? lane.active);
      const preferred = Boolean(
        viRaw && indications.includes(parseLaneIndication(String(viRaw))),
      );
      return { indications, displayIndication, active, preferred };
    });
  } catch {
    return null;
  }
}
