import type { NavBannerModel, NavStep } from './navModel';
import { phraseForManeuverKind } from './spokenManeuver';
import { bannerFieldsFromNavStep } from './navBannerFromStep';

function primaryLine(step: NavStep): string {
  const t = step.displayInstruction?.trim() || step.instruction?.trim();
  if (t) return t;
  const p = phraseForManeuverKind(step.kind);
  return p.charAt(0).toUpperCase() + p.slice(1);
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
    const ft =
      following.displayInstruction?.trim() ||
      following.instruction?.trim() ||
      phraseForManeuverKind(following.kind);
    secondaryInstruction = `Then ${ft}`;
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
