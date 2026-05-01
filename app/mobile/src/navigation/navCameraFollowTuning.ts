import type { DrivingMode } from '../types';

export type NavCameraFollowTuning = {
  minUpdateIntervalMs: number;
  minMoveMeters: number;
  minHeadingDeltaDeg: number;
  animationDurationMs: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Cadence for the JS-owned navigation camera.
 *
 * The location puck can update every RAF frame, but Mapbox camera animations should
 * not be restarted every frame. These values keep the camera slightly behind the
 * puck on purpose: enough damping to feel like a glide, short enough to avoid lag.
 */
export function getNavCameraFollowTuning(
  mode: DrivingMode,
  speedMps: number,
  nextManeuverDistanceMeters: number,
): NavCameraFollowTuning {
  const speed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  const maneuver = Number.isFinite(nextManeuverDistanceMeters)
    ? Math.max(0, nextManeuverDistanceMeters)
    : 400;
  const nearTurn01 = 1 - clamp((maneuver - 40) / 180, 0, 1);

  if (speed < 0.75) {
    return {
      minUpdateIntervalMs: 440,
      minMoveMeters: 2.4,
      minHeadingDeltaDeg: 8,
      animationDurationMs: mode === 'sport' ? 230 : mode === 'adaptive' ? 280 : 330,
    };
  }

  const modeBase =
    mode === 'sport'
      ? { interval: 70, move: 0.32, heading: 1.35, anim: 140 }
      : mode === 'calm'
        ? { interval: 135, move: 0.62, heading: 2.7, anim: 260 }
        : { interval: 95, move: 0.45, heading: 1.95, anim: 190 };

  const speed01 = clamp(speed / 24, 0, 1);
  return {
    minUpdateIntervalMs: Math.round(clamp(modeBase.interval - speed01 * 22 - nearTurn01 * 18, 54, 180)),
    minMoveMeters: Number(clamp(modeBase.move + speed01 * 0.12 - nearTurn01 * 0.14, 0.24, 0.82).toFixed(2)),
    minHeadingDeltaDeg: Number(clamp(modeBase.heading - nearTurn01 * 0.55, 0.85, 3.2).toFixed(1)),
    animationDurationMs: Math.round(clamp(modeBase.anim - speed01 * 32 - nearTurn01 * 24, 105, 310)),
  };
}
