import type { NavBannerModel, NavStep } from './navModel';
import { hudPhraseForStep } from './spokenManeuver';
import { bannerFieldsFromNavStep } from './navBannerFromStep';
import { formatManeuverDistanceBadge } from './utils/distanceFormatter';

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function shieldText(step: NavStep): string | null {
  const shield = step.shields.find((s) => s.displayRef || s.ref);
  if (!shield) return null;
  const ref = (shield.displayRef || shield.ref).trim();
  if (!ref) return null;
  if (/interstate/i.test(shield.network) && !/^I[-\s]/i.test(ref)) return `I-${ref}`;
  if (/^US[-\s]/i.test(ref) || /^I[-\s]/i.test(ref)) return ref;
  if (/us-|us national|united states/i.test(shield.network)) return `US-${ref}`;
  return ref;
}

function routeContextName(step: NavStep): string | null {
  const shield = shieldText(step);
  const road = step.destinationRoad || step.streetName;
  if (shield && road && !road.toLowerCase().includes(shield.toLowerCase())) {
    return `${shield} ${road}`;
  }
  return road || shield;
}

function primaryLine(step: NavStep): string {
  const base = hudPhraseForStep(step);
  const name = routeContextName(step);
  if (!name) return base;
  if (/\b(onto|toward|towards|to)\b/i.test(base)) return base;
  if (/^(continue|stay)/i.test(base)) return `Stay on ${name}`;
  if (/^(turn|bear|make a sharp)/i.test(base)) return `${base} onto ${name}`;
  if (/^(take|keep|merge)/i.test(base)) return `${base} toward ${name}`;
  return base;
}

function enrichThenLine(following: NavStep, distanceMeters: number): string {
  const phrase = hudPhraseForStep(following);
  const name = routeContextName(following);
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
