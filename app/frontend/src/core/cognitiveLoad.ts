/**
 * Cognitive load: weighted factors → 0–1. Speed + aggression + optional route complexity; traffic omitted without API.
 */

import type { VehicleState, DrivingStyle } from './types'

export function computeCognitiveLoad(
  vehicle: VehicleState,
  style: DrivingStyle,
  _routeComplexity?: number
): number {
  const speedFactor = Math.min(1, vehicle.velocity / 30) // 30 m/s ~= 67 mph
  const intersectionDensity = 0.1 // placeholder without route geometry
  const laneComplexity = _routeComplexity ?? 0.1
  const trafficDensity = 0 // no traffic API
  const aggressionScore = style.aggression

  const load =
    speedFactor * 0.3 +
    intersectionDensity * 0.2 +
    laneComplexity * 0.2 +
    trafficDensity * 0.2 +
    aggressionScore * 0.1
  return Math.max(0, Math.min(1, load))
}
