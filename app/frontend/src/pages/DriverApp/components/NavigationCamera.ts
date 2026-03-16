/**
 * 3D navigation camera controller for Google Maps.
 * Smoothly updates tilt, zoom, and heading during navigation based on speed and distance to next turn.
 */

export interface NavCameraOptions {
  map: google.maps.Map
  isNavigating: boolean
  userHeading: number
  userLat: number
  userLng: number
  speedMph: number
  distanceToNextTurn: number // meters
}

export class NavigationCamera {
  private map: google.maps.Map
  private animationFrame: number | null = null
  private targetTilt = 0
  private currentTilt = 0
  private targetHeading = 0
  private currentHeading = 0
  private targetZoom = 15
  private currentZoom = 15

  constructor(map: google.maps.Map) {
    this.map = map
  }

  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor
  }

  private lerpAngle(current: number, target: number, factor: number): number {
    let diff = target - current
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    return current + diff * factor
  }

  update(options: NavCameraOptions) {
    const { isNavigating, userHeading, userLat, userLng, speedMph, distanceToNextTurn } = options

    if (isNavigating) {
      this.targetTilt = 60
      if (speedMph < 5) {
        this.targetZoom = 19
      } else if (speedMph < 20) {
        this.targetZoom = 18
      } else if (speedMph < 40) {
        this.targetZoom = 17
      } else if (speedMph < 60) {
        this.targetZoom = 16
      } else {
        this.targetZoom = 15
      }
      if (distanceToNextTurn < 100) {
        this.targetZoom = Math.min(this.targetZoom + 1, 20)
      }
      this.targetHeading = userHeading
    } else {
      this.targetTilt = 0
      this.targetZoom = 15
      this.targetHeading = 0
    }

    this.currentTilt = this.lerp(this.currentTilt, this.targetTilt, 0.08)
    this.currentHeading = this.lerpAngle(this.currentHeading, this.targetHeading, 0.1)
    this.currentZoom = this.lerp(this.currentZoom, this.targetZoom, 0.05)

    this.map.moveCamera({
      center: { lat: userLat, lng: userLng },
      tilt: this.currentTilt,
      heading: this.currentHeading,
      zoom: this.currentZoom,
    })
  }

  animate(options: Omit<NavCameraOptions, 'map'>) {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    const frame = () => {
      this.update({ ...options, map: this.map })
    }
    this.animationFrame = requestAnimationFrame(frame)
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }
}
