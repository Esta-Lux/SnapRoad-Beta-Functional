/**
 * Predict position 1–3 seconds forward from current vehicle state.
 * MapKit-ready: same math can drive a ghost annotation on native.
 */

import type { VehicleState, Coordinate2D } from './types'

const EARTH_RADIUS_M = 6_371_000

function offsetCoordinate(from: Coordinate2D, distanceM: number, bearingDeg: number): Coordinate2D {
  const latRad = (from.lat * Math.PI) / 180
  const bearingRad = (bearingDeg * Math.PI) / 180
  const d = distanceM / EARTH_RADIUS_M
  const lat2 = Math.asin(
    Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(bearingRad)
  )
  const lng2 =
    (from.lng * Math.PI) / 180 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(lat2)
    )
  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  }
}

/**
 * Predict position in the future. velocity is in m/s; heading in degrees.
 */
export function predictPosition(state: VehicleState, seconds: number): Coordinate2D {
  const distanceM = state.velocity * seconds
  return offsetCoordinate(state.coordinate, distanceM, state.heading)
}

/**
 * Confidence decays with time (e.g. 1s = 0.95, 2s = 0.8, 3s = 0.6).
 */
export function predictionConfidence(seconds: number): number {
  return Math.max(0, 1 - seconds * 0.15)
}
