/**
 * Sensor fusion: raw GPS (+ optional device motion) → Kalman-smoothed VehicleState.
 * Web: Geolocation API; optional DeviceOrientation for heading on mobile.
 */

import { Kalman1D } from './kalman'
import type { VehicleState, Coordinate2D } from './types'

const DEG2RAD = Math.PI / 180

export interface FusionOptions {
  /** Process noise for Kalman (higher = more responsive, noisier). */
  processNoise?: number
  /** Measurement noise for Kalman (higher = trust prediction more). */
  measurementNoise?: number
}

export class SensorFusion {
  private kalmanLat: Kalman1D
  private kalmanLng: Kalman1D
  private kalmanSpeed: Kalman1D
  private kalmanHeading: Kalman1D
  private lastState: VehicleState | null = null
  private lastTime = 0

  constructor(options: FusionOptions = {}) {
    const q = options.processNoise ?? 0.01
    const r = options.measurementNoise ?? 2.0
    this.kalmanLat = new Kalman1D({ processNoise: q, measurementNoise: r })
    this.kalmanLng = new Kalman1D({ processNoise: q, measurementNoise: r })
    this.kalmanSpeed = new Kalman1D({ processNoise: 0.02, measurementNoise: 1.0, initialValue: 0 })
    this.kalmanHeading = new Kalman1D({ processNoise: 0.01, measurementNoise: 5.0 })
  }

  /**
   * Update with a raw GPS reading (and optional speed/heading from device).
   */
  update(reading: {
    lat: number
    lng: number
    speed?: number | null
    heading?: number | null
    accuracy?: number | null
    timestamp?: number
  }): VehicleState {
    const now = reading.timestamp ?? Date.now()
    const dt = this.lastTime ? (now - this.lastTime) / 1000 : 0
    this.lastTime = now

    const lat = this.kalmanLat.update(reading.lat)
    const lng = this.kalmanLng.update(reading.lng)

    // Speed: use GPS speed if available, else derive from position delta
    let speed = reading.speed ?? 0
    if (speed <= 0 && this.lastState && dt > 0) {
      const dist = haversineM(this.lastState.coordinate, { lat, lng })
      speed = dist / dt
    }
    speed = this.kalmanSpeed.update(speed)

    // Heading: use GPS or device heading, else derive from position delta
    let heading = reading.heading ?? 0
    if ((heading == null || isNaN(heading)) && this.lastState && dt > 0 && speed > 0.5) {
      heading = bearingDeg(this.lastState.coordinate, { lat, lng })
    }
    if (heading >= 0) this.kalmanHeading.update(heading)
    heading = this.kalmanHeading.value
    if (heading < 0) heading += 360
    if (heading >= 360) heading -= 360

    const turnRate = this.lastState && dt > 0
      ? normalizedAngleDeg(heading - this.lastState.heading) / dt
      : 0
    const acceleration = this.lastState && dt > 0
      ? (speed - this.lastState.velocity) / dt
      : 0
    const accuracy = reading.accuracy ?? 20
    const confidence = Math.max(0, 1 - accuracy / 50)

    const state: VehicleState = {
      coordinate: { lat, lng },
      velocity: speed,
      acceleration,
      heading,
      turnRate,
      confidence,
      timestamp: now,
    }
    this.lastState = state
    return state
  }

  getLastState(): VehicleState | null {
    return this.lastState
  }

  reset(initial?: { lat: number; lng: number }): void {
    this.lastState = null
    this.lastTime = 0
    if (initial) {
      this.kalmanLat.reset(initial.lat)
      this.kalmanLng.reset(initial.lng)
    } else {
      this.kalmanLat.reset(0)
      this.kalmanLng.reset(0)
    }
    this.kalmanSpeed.reset(0)
    this.kalmanHeading.reset(0)
  }
}

function haversineM(a: Coordinate2D, b: Coordinate2D): number {
  const dlat = (b.lat - a.lat) * DEG2RAD
  const dlng = (b.lng - a.lng) * DEG2RAD
  const x = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * DEG2RAD) * Math.cos(b.lat * DEG2RAD) * Math.sin(dlng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(x))
}

function bearingDeg(from: Coordinate2D, to: Coordinate2D): number {
  const f = from.lat * DEG2RAD
  const t = to.lat * DEG2RAD
  const dlng = (to.lng - from.lng) * DEG2RAD
  const y = Math.sin(dlng) * Math.cos(t)
  const x = Math.cos(f) * Math.sin(t) - Math.sin(f) * Math.cos(t) * Math.cos(dlng)
  let br = Math.atan2(y, x) * (180 / Math.PI)
  if (br < 0) br += 360
  return br
}

function normalizedAngleDeg(deg: number): number {
  while (deg > 180) deg -= 360
  while (deg < -180) deg += 360
  return deg
}
