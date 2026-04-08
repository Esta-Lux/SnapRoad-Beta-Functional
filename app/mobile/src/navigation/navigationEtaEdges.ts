import type { Coordinate } from '../types';
import { cumulativeRouteMeters, haversineMeters } from './navGeometry';
import type { NavStep } from './navModel';

/**
 * Remaining drive time from per-edge seconds and snap position along the polyline.
 */
export function remainingDurationSecondsFromEdges(args: {
  snapCumulativeMetersAlongPolyline: number;
  cumulativeVertexMeters: number[];
  edgeDurationSec: number[];
}): number {
  const cum = args.cumulativeVertexMeters;
  const dur = args.edgeDurationSec;
  if (cum.length < 2 || dur.length !== cum.length - 1) {
    return 0;
  }
  const total = cum[cum.length - 1] ?? 0;
  const C = Math.max(0, Math.min(args.snapCumulativeMetersAlongPolyline, total));
  if (C >= total - 1e-3) return 0;

  let i = 0;
  for (; i < dur.length; i++) {
    if (C < cum[i + 1]! - 1e-9) break;
  }
  i = Math.min(i, dur.length - 1);
  const start = cum[i]!;
  const end = cum[i + 1]!;
  const edgeLen = Math.max(1e-6, end - start);
  const fracRem = Math.max(0, Math.min(1, (end - C) / edgeLen));
  let sec = fracRem * Math.max(0, dur[i]!);
  for (let j = i + 1; j < dur.length; j++) {
    sec += Math.max(0, dur[j]!);
  }
  return Math.max(0, Math.round(sec));
}

/**
 * Build per-edge durations from Mapbox step geometry + step duration (proportional split).
 */
export function buildEdgeDurationSecFromSteps(polyline: Coordinate[], navSteps: NavStep[]): number[] | null {
  if (polyline.length < 2 || navSteps.length === 0) return null;
  const route = polyline.map((p) => ({ lat: p.lat, lng: p.lng }));
  const cum = cumulativeRouteMeters(route);
  const n = polyline.length - 1;
  const edgeDur = new Array<number>(n).fill(0);
  const lastEdgeIdx = n - 1;

  for (let i = 0; i < navSteps.length; i++) {
    const lo = Math.max(0, Math.min(navSteps[i]!.segmentIndex, lastEdgeIdx));
    const hiEx =
      i + 1 < navSteps.length
        ? Math.max(lo + 1, Math.min(navSteps[i + 1]!.segmentIndex, n))
        : n;
    let lenSum = 0;
    for (let e = lo; e < hiEx; e++) {
      lenSum += Math.max(0, cum[e + 1]! - cum[e]!);
    }
    const stepDur = Math.max(0, navSteps[i]!.durationSeconds ?? 0);
    if (lenSum < 1e-3 || hiEx <= lo) continue;
    if (stepDur < 1e-6) continue;
    for (let e = lo; e < hiEx; e++) {
      const el = Math.max(0, cum[e + 1]! - cum[e]!);
      edgeDur[e] += stepDur * (el / lenSum);
    }
  }

  return edgeDur.some((x) => x > 0) ? edgeDur : null;
}

/**
 * Prefer Mapbox `annotations.duration` when aligned; else proportional step split.
 */
export function resolveEdgeDurationSec(args: {
  polyline: Coordinate[];
  navSteps: NavStep[];
  mapboxEdgeDurationSec?: number[] | undefined;
}): number[] | null {
  const n = Math.max(0, args.polyline.length - 1);
  const ann = args.mapboxEdgeDurationSec;
  if (ann && ann.length === n && ann.some((x) => x > 0)) {
    return ann.map((x) => Math.max(0, x));
  }
  return buildEdgeDurationSecFromSteps(args.polyline, args.navSteps);
}
