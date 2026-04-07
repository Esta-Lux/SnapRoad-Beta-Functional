import { useMemo, useRef } from 'react';
import { nextFusedNavState, type Coordinate, type FusedNavState, type RoutePoint } from '../navigation/fusedLocation';

/**
 * Fused navigation display location: smooth toward snapped route, blended heading.
 * Reset when the active route geometry changes.
 */
export function useFusedNavigationLocation(args: {
  rawLocation: Coordinate | null;
  route: RoutePoint[] | null;
  isNavigating: boolean;
}) {
  const stateRef = useRef<FusedNavState | null>(null);
  const routeIdRef = useRef('');
  const rid =
    args.route && args.route.length >= 2
      ? `${args.route.length}:${args.route[0]!.lat.toFixed(5)}:${args.route[0]!.lng.toFixed(5)}:${args.route[args.route.length - 1]!.lat.toFixed(5)}`
      : '';
  if (rid !== routeIdRef.current) {
    stateRef.current = null;
    routeIdRef.current = rid;
  }

  return useMemo(() => {
    const raw = args.rawLocation;
    if (!raw || !args.isNavigating || !args.route || args.route.length < 2) {
      stateRef.current = null;
      return null;
    }
    const next = nextFusedNavState({
      prev: stateRef.current,
      raw,
      route: args.route,
      isNavigating: true,
    });
    stateRef.current = next;
    return next;
  }, [
    args.isNavigating,
    args.rawLocation?.lat,
    args.rawLocation?.lng,
    args.rawLocation?.heading,
    args.rawLocation?.speedMps,
    args.rawLocation?.accuracy,
    args.rawLocation?.timestamp,
    args.route,
    rid,
  ]);
}
