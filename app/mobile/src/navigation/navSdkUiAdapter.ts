import type { DirectionsStep } from '../lib/directions';
import type { ManeuverKind, NavBannerModel, NavStep } from './navModel';
import { maneuverKeyFromKind } from './spokenManeuver';

/** Matches `DirectionsStep.maneuver` / {@link iconManeuverForState} (substring checks). */
function maneuverStringFromKind(kind: ManeuverKind): string {
  return maneuverKeyFromKind(kind);
}

/** Banner icon modifiers expect plain tokens (see TurnInstructionCard `getBannerTurnIcon`). */
function bannerModifierFromKind(kind: ManeuverKind): string {
  return maneuverKeyFromKind(kind);
}

/**
 * Minimal {@link DirectionsStep} derived only from SDK-backed {@link NavStep} / banner
 * so TurnInstructionCard does not read REST Directions rows (indices diverge after SDK reroute).
 */
export function directionsStepFromSdkProgress(args: {
  nextStep: NavStep | null | undefined;
  banner: NavBannerModel | null | undefined;
  at: { lat: number; lng: number };
}): DirectionsStep | null {
  const { nextStep, banner, at } = args;
  if (!nextStep) return null;
  const instruction =
    nextStep.displayInstruction?.trim() ||
    banner?.primaryInstruction?.trim() ||
    nextStep.instruction?.trim() ||
    '';
  if (!instruction && nextStep.kind !== 'arrive') return null;

  return {
    instruction: instruction || 'Arrive at destination',
    distance: '',
    distanceMeters: nextStep.distanceMetersToNext,
    duration: '',
    durationSeconds: nextStep.durationSeconds,
    maneuver: maneuverStringFromKind(nextStep.kind),
    name: nextStep.streetName ?? undefined,
    lat: at.lat,
    lng: at.lng,
    bannerInstructions: banner
      ? [
          {
            primary: {
              type: nextStep.kind === 'arrive' ? 'arrive' : 'turn',
              text: banner.primaryInstruction,
              modifier: bannerModifierFromKind(nextStep.kind),
            },
          },
        ]
      : undefined,
  };
}
