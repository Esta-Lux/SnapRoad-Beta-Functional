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
      minUpdateIntervalMs: 420,
      minMoveMeters: 2.4,
      minHeadingDeltaDeg: 8,
      animationDurationMs: mode === 'sport' ? 220 : mode === 'adaptive' ? 280 : 340,
    };
  }

  const modeBase =
    mode === 'sport'
      ? { interval: 120, move: 0.7, heading: 2.8, anim: 220 }
      : mode === 'calm'
        ? { interval: 210, move: 1.15, heading: 4.8, anim: 390 }
        : { interval: 160, move: 0.9, heading: 3.6, anim: 300 };

  const speed01 = clamp(speed / 24, 0, 1);
  return {
    minUpdateIntervalMs: Math.round(clamp(modeBase.interval - speed01 * 35 - nearTurn01 * 35, 80, 260)),
    minMoveMeters: Number((modeBase.move + speed01 * 0.35 - nearTurn01 * 0.2).toFixed(2)),
    minHeadingDeltaDeg: Number(clamp(modeBase.heading - nearTurn01 * 1.1, 1.8, 5.2).toFixed(1)),
    animationDurationMs: Math.round(clamp(modeBase.anim - speed01 * 55 - nearTurn01 * 45, 160, 430)),
  };
}
