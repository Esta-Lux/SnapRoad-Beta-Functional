import type { NavBannerModel, NavStep } from './navModel';
import { hudPhraseForManeuverKind } from './spokenManeuver';
import { bannerFieldsFromNavStep } from './navBannerFromStep';

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function primaryLine(step: NavStep): string {
  return hudPhraseForManeuverKind(step.kind, step.roundaboutExitNumber);
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
    const ft = hudPhraseForManeuverKind(following.kind, following.roundaboutExitNumber);
    secondaryInstruction = `Then ${lowerFirst(ft)}`;
  }

  return {
    primaryInstruction,
    primaryDistanceMeters,
    primaryStreet: next.streetName ?? null,
    secondaryInstruction,
    subInstruction: rich?.subInstruction ?? null,
    signal: rich?.signal,
    lanes: rich?.lanes,
    shields: rich?.shields,
    maneuverKind: rich?.maneuverKind,
    roundaboutExitNumber: rich?.roundaboutExitNumber,
  };
}
