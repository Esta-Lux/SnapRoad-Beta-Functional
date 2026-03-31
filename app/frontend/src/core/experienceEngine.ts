/**
 * Experience engine: VehicleState + DrivingStyle + CognitiveLoad + Mode → ExperienceState (zoom, pitch, glow, etc.).
 */

import type { VehicleState, DrivingStyle, DrivingMode, ExperienceState } from './types'

const BASE_ZOOM = 800
const CALM_ZOOM_OFFSET = 150
const SPORT_ZOOM_OFFSET = -100

export function computeExperience(
  vehicle: VehicleState,
  style: DrivingStyle,
  cognitiveLoad: number,
  mode: DrivingMode
): ExperienceState {
  const v = vehicle.velocity
  const aggression = style.aggression

  let baseZoom = BASE_ZOOM - v * 2
  if (mode === 'calm') baseZoom -= CALM_ZOOM_OFFSET
  if (mode === 'sport') baseZoom += SPORT_ZOOM_OFFSET
  const adaptiveZoom = baseZoom * (1 + cognitiveLoad * 0.2)
  const zoom = Math.max(12, Math.min(20, 17 - Math.log2(adaptiveZoom / 400)))

  const pitch = 60 + aggression * 10
  const routeGlow = mode === 'sport' ? 1 : 0.6 + aggression * 0.4
  const laneHighlight = cognitiveLoad
  const instructionLeadTime = 2 + cognitiveLoad

  return {
    zoom,
    pitch,
    routeGlow,
    laneHighlight,
    instructionLeadTime,
  }
}

/** Interpolate current toward target (e.g. per-frame smoothing). */
export function interpolateExperience(
  current: ExperienceState,
  target: ExperienceState,
  factor: number
): ExperienceState {
  const f = Math.max(0, Math.min(1, factor))
  return {
    zoom: current.zoom + (target.zoom - current.zoom) * f,
    pitch: current.pitch + (target.pitch - current.pitch) * f,
    routeGlow: current.routeGlow + (target.routeGlow - current.routeGlow) * f,
    laneHighlight: current.laneHighlight + (target.laneHighlight - current.laneHighlight) * f,
    instructionLeadTime:
      current.instructionLeadTime + (target.instructionLeadTime - current.instructionLeadTime) * f,
  }
}

/** Resolve effective mode when mode is 'adaptive': blend calm/sport by aggression and smoothness. */
export function effectiveModeParams(
  mode: DrivingMode,
  style: DrivingStyle
): { zoomFactor: number; glowFactor: number } {
  if (mode === 'calm') return { zoomFactor: 1.15, glowFactor: 0.6 }
  if (mode === 'sport') return { zoomFactor: 0.9, glowFactor: 1 }
  const t = style.aggression * (1 - style.smoothness * 0.5)
  return {
    zoomFactor: 1.15 - t * 0.25,
    glowFactor: 0.6 + t * 0.4,
  }
}
