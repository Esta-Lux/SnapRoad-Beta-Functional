/**
 * Driving Mode Styles — Calm, Adaptive, Sport
 * Controls map appearance, colors, animation speed, and HUD behavior.
 */

export type DrivingMode = 'calm' | 'adaptive' | 'sport'

export interface DrivingModeConfig {
  // Map
  pitch: number
  zoomOffset: number
  fogRange: [number, number]
  fogColor: string
  terrainExaggeration: number
  buildingOpacity: number

  // Route colors
  routeAheadColor: string
  routeTransitionColor: string
  routeGlowOpacity: number
  routeWidth: number

  // Camera
  cameraDamping: number
  followDistance: number

  // UI
  hudStyle: 'minimal' | 'standard' | 'performance'
  accentColor: string
  showSpeedWarning: boolean
  speedWarningThreshold: number

  // Labels
  label: string
  description: string
  icon: string
}

export const DRIVING_MODES: Record<DrivingMode, DrivingModeConfig> = {
  calm: {
    // Calm: calm green palette, minimal motion.
    pitch: 38,
    zoomOffset: -0.7,
    fogRange: [1.5, 14],
    fogColor: '#eee8dd',
    terrainExaggeration: 0.0,
    buildingOpacity: 0.55,
    routeAheadColor: '#22A67A',
    routeTransitionColor: '#34C759',
    routeGlowOpacity: 0.12,
    routeWidth: 0.9,
    cameraDamping: 950,
    followDistance: 15.5,
    hudStyle: 'minimal',
    accentColor: '#6BA5D7',
    showSpeedWarning: true,
    speedWarningThreshold: 5,
    label: 'Calm',
    description: 'Breathing route glow, minimal motion',
    icon: '🧘',
  },
  adaptive: {
    // Adaptive: blue fading to green (default polyline).
    pitch: 50,
    zoomOffset: 0,
    fogRange: [1.0, 12],
    fogColor: '#eae6de',
    terrainExaggeration: 1.15,
    buildingOpacity: 0.82,
    routeAheadColor: '#2563EB',
    routeTransitionColor: '#16A34A',
    routeGlowOpacity: 0.18,
    routeWidth: 1.0,
    cameraDamping: 500,
    followDistance: 16.5,
    hudStyle: 'standard',
    accentColor: '#4A90D9',
    showSpeedWarning: true,
    speedWarningThreshold: 8,
    label: 'Adaptive',
    description: 'Balanced clarity, steady routing',
    icon: '🚗',
  },
  sport: {
    // Sport: red palette, punchy and dramatic.
    pitch: 62,
    zoomOffset: 1.2,
    fogRange: [0.5, 8],
    fogColor: '#d8d0c4',
    terrainExaggeration: 1.4,
    buildingOpacity: 1.0,
    routeAheadColor: '#DC2626',
    routeTransitionColor: '#EA580C',
    routeGlowOpacity: 0.30,
    routeWidth: 1.25,
    cameraDamping: 220,
    followDistance: 18.0,
    hudStyle: 'performance',
    accentColor: '#3A7BD5',
    showSpeedWarning: false,
    speedWarningThreshold: 15,
    label: 'Sport',
    description: 'Pulse glow, aggressive camera, dramatic 3D',
    icon: '🏎️',
  },
}
