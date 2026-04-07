import { useMemo, useRef } from 'react';
import { NavigationProgress, RawLocation, RoutePoint, NavStep } from '../navigation/navModel';
import type { OffRouteTuning } from '../navigation/offRouteTuning';
import { computeNavigationProgressFrame } from '../navigation/navigationProgressCore';

type Args = {
  rawLocation: RawLocation | null;
  route: RoutePoint[];
  steps: NavStep[];
  routeDurationSeconds: number;
  offRouteTuning: OffRouteTuning;
};

export function useNavigationProgress({
  rawLocation,
  route,
  steps,
  routeDurationSeconds,
  offRouteTuning,
}: Args): NavigationProgress | null {
  const prevRef = useRef<NavigationProgress | null>(null);

  return useMemo(() => {
    if (!rawLocation || route.length < 2) {
      prevRef.current = null;
      return null;
    }

    const next = computeNavigationProgressFrame({
      rawLocation,
      route,
      steps,
      routeDurationSeconds,
      offRouteTuning,
      previous: prevRef.current,
    });

    if (!next) {
      return prevRef.current;
    }

    prevRef.current = next;
    return next;
  }, [rawLocation, route, steps, routeDurationSeconds, offRouteTuning]);
}
