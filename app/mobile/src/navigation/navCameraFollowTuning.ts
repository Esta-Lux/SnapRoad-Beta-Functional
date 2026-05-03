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
 * not be restarted every frame. These values keep center/bearing commands close
 * enough to the puck that the camera feels attached while still filtering stoplight
 * jitter.
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
      minUpdateIntervalMs: 560,
      minMoveMeters: 3.2,
      minHeadingDeltaDeg: 12,
      animationDurationMs: mode === 'sport' ? 230 : mode === 'adaptive' ? 280 : 330,
    };
  }

  const modeBase =
    mode === 'sport'
      ? { interval: 48, move: 0.2, heading: 0.9, anim: 96 }
      : mode === 'calm'
        ? { interval: 82, move: 0.36, heading: 1.75, anim: 170 }
        : { interval: 64, move: 0.26, heading: 1.25, anim: 122 };

  const speed01 = clamp(speed / 24, 0, 1);
  return {
    minUpdateIntervalMs: Math.round(clamp(modeBase.interval - speed01 * 16 - nearTurn01 * 12, 38, 140)),
    minMoveMeters: Number(clamp(modeBase.move + speed01 * 0.08 - nearTurn01 * 0.08, 0.16, 0.56).toFixed(2)),
    minHeadingDeltaDeg: Number(clamp(modeBase.heading - nearTurn01 * 0.35, 0.55, 2.2).toFixed(1)),
    animationDurationMs: Math.round(clamp(modeBase.anim - speed01 * 22 - nearTurn01 * 18, 72, 220)),
  };
}
