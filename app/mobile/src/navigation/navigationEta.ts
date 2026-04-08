import type { NavStep } from './navModel';

/**
 * Remaining drive time using **per-step** Mapbox `duration` values (traffic-aware at fetch time),
 * prorated by position within the current step. Snap progress is measured along the **polyline**;
 * it is mapped into Mapbox step distance space using `routeDistanceMetersApi` when it differs
 * slightly from {@link polylineTotalMeters}.
 *
 * Falls back to proportional `(1 - progress) * routeDurationSecondsFallback` when steps lack
 * usable durations.
 */
export function remainingDurationSecondsFromNavSteps(args: {
  snapCumulativeMetersAlongPolyline: number;
  polylineTotalMeters: number;
  routeDistanceMetersApi: number;
  steps: NavStep[];
  routeDurationSecondsFallback: number;
}): number {
  const {
    snapCumulativeMetersAlongPolyline,
    polylineTotalMeters,
    routeDistanceMetersApi,
    steps,
    routeDurationSecondsFallback,
  } = args;

  const polyT = Math.max(1e-6, polylineTotalMeters);
  const apiD = Math.max(0, routeDistanceMetersApi);
  const routeLenForAlignment = Math.max(polyT, apiD > 1 ? apiD : polyT);
  const progress01 = Math.max(0, Math.min(1, snapCumulativeMetersAlongPolyline / polyT));
  const alignedCum = progress01 * routeLenForAlignment;

  if (steps.length === 0 || routeDurationSecondsFallback <= 0) {
    return Math.max(0, Math.round((1 - progress01) * Math.max(0, routeDurationSecondsFallback)));
  }

  const totalStepDur = steps.reduce((s, st) => s + Math.max(0, st.durationSeconds ?? 0), 0);
  if (totalStepDur < 2) {
    return Math.max(0, Math.round((1 - progress01) * routeDurationSecondsFallback));
  }

  const lastStep = steps[steps.length - 1]!;
  const stepSpaceTotal = Math.max(
    routeLenForAlignment,
    lastStep.distanceMetersFromStart + Math.max(0, lastStep.distanceMetersToNext),
    apiD,
  );

  const c = Math.max(0, Math.min(alignedCum, stepSpaceTotal));

  let remainingSec = 0;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i]!;
    const start = st.distanceMetersFromStart;
    const end = i + 1 < steps.length ? steps[i + 1]!.distanceMetersFromStart : stepSpaceTotal;
    const dur = Math.max(0, st.durationSeconds ?? 0);
    const len = Math.max(1e-6, end - start);

    if (c >= end - 1e-3) continue;

    if (c <= start + 1e-3) {
      for (let j = i; j < steps.length; j++) {
        remainingSec += Math.max(0, steps[j]!.durationSeconds ?? 0);
      }
      break;
    }

    const fracRemaining = (end - c) / len;
    remainingSec += Math.max(0, Math.min(1, fracRemaining)) * dur;
    for (let j = i + 1; j < steps.length; j++) {
      remainingSec += Math.max(0, steps[j]!.durationSeconds ?? 0);
    }
    break;
  }

  return Math.max(0, Math.round(remainingSec));
}
