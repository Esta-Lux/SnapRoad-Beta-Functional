import type { NavBannerModel, NavStep } from './navModel';
import { phraseForManeuverKind } from './spokenManeuver';

function primaryLine(step: NavStep): string {
  const t = step.displayInstruction?.trim() || step.instruction?.trim();
  if (t) return t;
  const p = phraseForManeuverKind(step.kind);
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/**
 * Primary = **only** the upcoming maneuver.
 * Secondary = optional “Then …” for the following step (never a competing bare turn without “Then”).
 */
export function buildNavBanner(
  next: NavStep | null,
  following: NavStep | null,
  primaryDistanceMeters: number,
): NavBannerModel | null {
  if (!next) return null;

  const primaryInstruction = primaryLine(next);
  let secondaryInstruction: string | null = null;
  if (following) {
    const ft = following.instruction?.trim() || phraseForManeuverKind(following.kind);
    secondaryInstruction = `Then ${ft}`;
  }

  return {
    primaryInstruction,
    primaryDistanceMeters,
    primaryStreet: next.streetName ?? null,
    secondaryInstruction,
  };
}
