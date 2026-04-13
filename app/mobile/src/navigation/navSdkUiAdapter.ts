import type { DirectionsStep } from '../lib/directions';
import type { NavBannerModel, NavStep } from './navModel';
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
 *
 * When {@link args.routeStep} matches the same step index, its maneuver **lat/lng** and
 * **mapboxManeuver** are merged so along-route distance and turn glyphs align with geometry.
 */
export function directionsStepFromSdkProgress(args: {
  nextStep: NavStep | null | undefined;
  banner: NavBannerModel | null | undefined;
  at: { lat: number; lng: number };
  /** REST step at the same index when the active route row still matches the SDK step. */
  routeStep?: DirectionsStep | null;
}): DirectionsStep | null {
  const { nextStep, banner, at, routeStep } = args;
  if (!nextStep) return null;
  const instruction =
    nextStep.displayInstruction?.trim() ||
    banner?.primaryInstruction?.trim() ||
    nextStep.instruction?.trim() ||
    '';
  if (!instruction && nextStep.kind !== 'arrive') return null;

  const rs = routeStep ?? null;
  const useRouteAnchor =
    rs != null &&
    Number.isFinite(rs.lat) &&
    Number.isFinite(rs.lng) &&
    !(rs.lat === 0 && rs.lng === 0);
  const lat = useRouteAnchor ? rs!.lat : at.lat;
  const lng = useRouteAnchor ? rs!.lng : at.lng;

  const mm = rs?.mapboxManeuver;
  const mapboxManeuver =
    mm != null && (mm.type != null || mm.modifier != null) ? { ...mm } : undefined;

  return {
    instruction: instruction || 'Arrive at destination',
    distance: '',
    distanceMeters: nextStep.distanceMetersToNext,
    duration: '',
    durationSeconds: nextStep.durationSeconds,
    maneuver: maneuverStringFromKind(nextStep.kind),
    name: nextStep.streetName ?? rs?.name ?? undefined,
    lat,
    lng,
    ...(mapboxManeuver ? { mapboxManeuver } : {}),
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
