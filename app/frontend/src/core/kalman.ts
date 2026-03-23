/**
 * 1D Kalman filter for smoothing GPS and derived signals (speed, heading).
 */

export class Kalman1D {
  private q: number
  private r: number
  private x: number
  private p: number
  private k: number

  constructor(options?: { processNoise?: number; measurementNoise?: number; initialValue?: number }) {
    this.q = options?.processNoise ?? 0.01
    this.r = options?.measurementNoise ?? 3.0
    this.x = options?.initialValue ?? 0
    this.p = 1
    this.k = 0
  }

  update(measurement: number): number {
    this.p += this.q
    this.k = this.p / (this.p + this.r)
    this.x += this.k * (measurement - this.x)
    this.p *= 1 - this.k
    return this.x
  }

  get value(): number {
    return this.x
  }

  reset(value?: number): void {
    this.x = value ?? 0
    this.p = 1
    this.k = 0
  }
}
