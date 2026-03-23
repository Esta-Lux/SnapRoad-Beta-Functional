/**
 * Map matching: snap raw GPS to route polyline.
 * Score = distance * 0.7 + headingDiff * 0.3; prefer segment within 30m, penalize heading mismatch > 45°.
 */

import type { Coordinate2D, RouteSegment } from './types'

const EARTH_RADIUS_M = 6_371_000
const MAX_SNAP_DISTANCE_M = 30
const HEADING_PENALTY_THRESHOLD_DEG = 45

function haversineM(a: Coordinate2D, b: Coordinate2D): number {
  const dlat = ((b.lat - a.lat) * Math.PI) / 180
  const dlng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dlat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dlng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(x))
}

/** Project point onto segment; return closest point on segment and distance in meters. */
function pointToSegmentDistance(
  point: Coordinate2D,
  segStart: Coordinate2D,
  segEnd: Coordinate2D
): { closest: Coordinate2D; distanceM: number } {
  const px = point.lng
  const py = point.lat
  const ax = segStart.lng
  const ay = segStart.lat
  const bx = segEnd.lng
  const by = segEnd.lat
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const d = haversineM(point, segStart)
    return { closest: { ...segStart }, distanceM: d }
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const closest = { lat: ay + t * dy, lng: ax + t * dx }
  const distanceM = haversineM(point, closest)
  return { closest, distanceM }
}

function normalizeAngleDeg(deg: number): number {
  let d = deg
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

/**
 * Find best snap of GPS to route segments. Returns snapped coordinate and segment id, or null if none within 30m.
 */
export function snapToRoute(
  gps: Coordinate2D,
  headingDeg: number,
  segments: RouteSegment[]
): { coordinate: Coordinate2D; segmentId: string } | null {
  let bestScore = Infinity
  let best: { coordinate: Coordinate2D; segmentId: string } | null = null

  for (const seg of segments) {
    const poly = seg.polyline
    if (poly.length < 2) continue

    for (let i = 0; i < poly.length - 1; i++) {
      const { closest, distanceM } = pointToSegmentDistance(gps, poly[i], poly[i + 1])
      if (distanceM > MAX_SNAP_DISTANCE_M) continue

      const headingDiff = Math.abs(normalizeAngleDeg(headingDeg - seg.heading))
      const headingPenalty = headingDiff > HEADING_PENALTY_THRESHOLD_DEG ? 0.5 + (headingDiff - HEADING_PENALTY_THRESHOLD_DEG) / 180 : 0
      const score = distanceM * 0.7 + headingPenalty * 100 * 0.3

      if (score < bestScore) {
        bestScore = score
        best = { coordinate: closest, segmentId: seg.id }
      }
    }
  }
  return best
}

/** Build a single RouteSegment from a polyline (for directions from API). */
export function segmentFromPolyline(polyline: Coordinate2D[], id = 'route'): RouteSegment {
  const poly = polyline.length >= 2 ? polyline : []
  let heading = 0
  if (poly.length >= 2) {
    const a = poly[0]
    const b = poly[1]
    const dLng = ((b.lng - a.lng) * Math.PI) / 180
    const lat1 = (a.lat * Math.PI) / 180
    const lat2 = (b.lat * Math.PI) / 180
    const x = Math.cos(lat2) * Math.sin(dLng)
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
    heading = (Math.atan2(x, y) * 180) / Math.PI
    if (heading < 0) heading += 360
  }
  return { id, polyline: poly, heading }
}
