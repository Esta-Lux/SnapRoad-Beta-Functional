import type { DirectionsStep } from '../lib/directions';
import type { ManeuverKind, NavBannerModel, NavStep } from './navModel';
import { navManeuverFieldsFromDirectionsStep, resolveManeuverKind } from './navStepsFromDirections';
import { maneuverKeyFromKind } from './spokenManeuver';

/** Matches `DirectionsStep.maneuver` / {@link iconManeuverForState} (substring checks). */
function maneuverStringFromKind(kind: ManeuverKind): string {
  return maneuverKeyFromKind(kind);
}

/** Banner icon modifiers expect plain tokens (see TurnInstructionCard `getBannerTurnIcon`). */
function bannerModifierFromKind(kind: ManeuverKind): string {
  return maneuverKeyFromKind(kind);
}

function normText(v?: string | null): string {
  return String(v ?? '').trim().toLowerCase();
}

function routeStepMatchesSdk(routeStep: DirectionsStep | null | undefined, nextStep: NavStep): routeStep is DirectionsStep {
  if (!routeStep) return false;
  const routeFields = navManeuverFieldsFromDirectionsStep(routeStep);
  if (routeFields.kind === 'unknown' || routeFields.kind !== nextStep.kind) return false;
  const sdkStreet = normText(nextStep.streetName);
  const routeStreet = normText(routeStep.name);
  if (!sdkStreet || !routeStreet) return true;
  return sdkStreet === routeStreet;
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

  const rs = routeStepMatchesSdk(routeStep, nextStep) ? routeStep : null;
  const useRouteAnchor =
    rs != null &&
    Number.isFinite(rs.lat) &&
    Number.isFinite(rs.lng) &&
    !(rs.lat === 0 && rs.lng === 0);
  const lat = useRouteAnchor ? rs!.lat : at.lat;
  const lng = useRouteAnchor ? rs!.lng : at.lng;

  const routeMm = rs?.mapboxManeuver;
  const rawFieldsMatchKind =
    !!(nextStep.rawType || nextStep.rawModifier) &&
    resolveManeuverKind(nextStep.rawType, nextStep.rawModifier) === nextStep.kind;
  const mapboxManeuver =
    routeMm != null && (routeMm.type != null || routeMm.modifier != null)
      ? { ...routeMm }
      : rawFieldsMatchKind
          ? {
              type: nextStep.rawType || undefined,
              modifier: nextStep.rawModifier || undefined,
            }
          : undefined;

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
