/**
 * Driving behavior engine: history buffer → aggression, smoothness, hesitation.
 */

import type { VehicleState, DrivingStyle } from './types'

const HISTORY_MAX_SEC = 45
const HISTORY_HZ = 2
const HISTORY_MAX_LEN = Math.ceil(HISTORY_MAX_SEC * HISTORY_HZ)

function normalize(x: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.max(0, Math.min(1, (x - min) / (max - min)))
}

export class DrivingBehaviorEngine {
  private history: VehicleState[] = []

  push(state: VehicleState): void {
    this.history.push(state)
    if (this.history.length > HISTORY_MAX_LEN) this.history.shift()
  }

  getStyle(): DrivingStyle {
    const h = this.history
    if (h.length < 3) {
      return { aggression: 0, smoothness: 1, hesitation: 0 }
    }

    const accels = h.map((s) => s.acceleration)
    const turnRates = h.map((s) => s.turnRate)
    const variance = (arr: number[]) => {
      const n = arr.length
      const mean = arr.reduce((a, b) => a + b, 0) / n
      return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n
    }
    const accelVariance = variance(accels)
    const turnRateVariance = variance(turnRates)
    const brakeIntensity = accels.filter((a) => a < -0.5).reduce((s, a) => s + Math.abs(a), 0) / Math.max(1, accels.length)
    const normAccel = normalize(accelVariance, 0, 4)
    const normTurn = normalize(turnRateVariance, 0, 100)
    const normBrake = normalize(brakeIntensity, 0, 2)
    const aggression = normAccel * 0.4 + normTurn * 0.3 + normBrake * 0.3

    const smoothness = 1 - Math.min(1, accelVariance * 0.5 + turnRateVariance * 0.005)
    const signChanges = accels.slice(1).filter((a, i) => (a >= 0) !== (accels[i] >= 0)).length
    const hesitation = normalize(signChanges / Math.max(1, accels.length), 0, 0.5)

    return {
      aggression: Math.max(0, Math.min(1, aggression)),
      smoothness: Math.max(0, Math.min(1, smoothness)),
      hesitation: Math.max(0, Math.min(1, hesitation)),
    }
  }

  clear(): void {
    this.history = []
  }
}
