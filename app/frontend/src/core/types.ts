/**
 * Driving intelligence core types.
 * MapKit-ready: same concepts work with MapKit camera/annotation/overlay on native.
 */

export interface Coordinate2D {
  lat: number
  lng: number
}

/** Fused vehicle state (GPS + optional IMU, Kalman-smoothed). */
export interface VehicleState {
  coordinate: Coordinate2D
  velocity: number       // m/s
  acceleration: number  // m/s²
  heading: number      // degrees 0–360
  turnRate: number     // deg/s
  confidence: number   // 0–1
  timestamp: number    // ms
}

/** Camera state for map renderer (MapKit / Leaflet / custom). */
export interface MapCameraState {
  center: Coordinate2D
  zoom: number
  bearing: number     // degrees, 0 = north
  pitch?: number      // optional tilt (MapKit supports; 2D maps ignore)
}

/** Route segment for map matching. */
export interface RouteSegment {
  id: string
  polyline: Coordinate2D[]
  heading: number
}

/** Predicted position for ghost car / ETA. */
export interface PredictedPosition {
  coordinate: Coordinate2D
  confidence: number   // 0–1
  inSeconds: number
}

/** Driving mode (blueprint: Calm / Sport / Adaptive). */
export type DrivingMode = 'adaptive' | 'sport' | 'calm'

/** Driving style derived from behavior metrics. */
export interface DrivingStyle {
  aggression: number   // 0–1
  smoothness: number  // 0–1
  hesitation: number  // 0–1
}

/** Experience state: what the map/UI should feel like (zoom, glow, camera, instructions). */
export interface ExperienceState {
  zoom: number
  pitch: number
  routeGlow: number   // 0–1
  laneHighlight: number
  instructionLeadTime: number  // seconds
}
