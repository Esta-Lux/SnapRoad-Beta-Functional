import type { NavBannerModel, NavStep } from './navModel';
import { hudPhraseForManeuverKind } from './spokenManeuver';
import { bannerFieldsFromNavStep } from './navBannerFromStep';
import { formatManeuverDistanceBadge } from './utils/distanceFormatter';

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function primaryLine(step: NavStep): string {
  const base = hudPhraseForManeuverKind(step.kind, step.roundaboutExitNumber);
  const name = step.streetName || step.destinationRoad;
  if (!name) return base;
  if (/\b(onto|toward|towards|to)\b/i.test(base)) return base;
  if (/^(turn|bear|make a sharp)/i.test(base)) return `${base} onto ${name}`;
  if (/^(take|keep|merge)/i.test(base)) return `${base} toward ${name}`;
  return base;
}

function enrichThenLine(following: NavStep, distanceMeters: number): string {
  const phrase = hudPhraseForManeuverKind(following.kind, following.roundaboutExitNumber);
  const name = following.streetName || following.destinationRoad;
  const withName =
    name && !/\b(onto|toward|towards|to)\b/i.test(phrase)
      ? `${phrase} onto ${name}`
      : phrase;
  const suffix =
    Number.isFinite(distanceMeters) && distanceMeters > 0 && distanceMeters < 804.672
      ? ` (${formatManeuverDistanceBadge(distanceMeters, { omitNowLabel: true })})`
      : '';
  return `Then ${lowerFirst(withName)}${suffix}`;
}

/**
 * Primary = upcoming maneuver only.
 * Secondary = optional “Then …” for the following step.
 */
export function buildNavBanner(
  next: NavStep | null,
  following: NavStep | null,
  primaryDistanceMeters: number,
): NavBannerModel | null {
  if (!next) return null;

  const primaryInstruction = primaryLine(next);
  const rich = bannerFieldsFromNavStep(next);

  let secondaryInstruction: string | null = rich?.secondaryInstruction ?? null;
  if (following) {
    secondaryInstruction = enrichThenLine(following, next.distanceMeters);
  }

  return {
    primaryInstruction,
    primaryDistanceMeters,
    primaryStreet: next.streetName ?? null,
    exitNumber: rich?.exitNumber ?? next.exitNumber ?? null,
    secondaryInstruction,
    subInstruction: rich?.subInstruction ?? null,
    signal: rich?.signal,
    lanes: rich?.lanes,
    shields: rich?.shields,
    maneuverKind: rich?.maneuverKind,
    roundaboutExitNumber: rich?.roundaboutExitNumber,
  };
}
