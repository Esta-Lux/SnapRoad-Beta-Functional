export type DriveSafetyState = {
  lastSampleMs: number | null;
  lastSpeedMph: number | null;
  lastHardBrakeAtMs: number | null;
  speedingSinceMs: number | null;
  lastSpeedingEventAtMs: number | null;
  hardBrakingEvents: number;
  speedingEvents: number;
};

export type DriveSafetySample = {
  atMs: number;
  speedMph: number;
  speedLimitMph?: number | null;
  gpsAccuracyM?: number | null;
  isNavigating: boolean;
};

const HARD_BRAKE_DECEL_MPH_PER_SEC = 8;
const HARD_BRAKE_MIN_START_SPEED_MPH = 12;
const HARD_BRAKE_COOLDOWN_MS = 8000;
const SPEEDING_HOLD_MS = 10000;
const SPEEDING_COOLDOWN_MS = 30000;
const MAX_REASONABLE_SPEED_MPH = 160;
const MAX_GPS_ACCURACY_M = 75;

export function emptyDriveSafetyState(): DriveSafetyState {
  return {
    lastSampleMs: null,
    lastSpeedMph: null,
    lastHardBrakeAtMs: null,
    speedingSinceMs: null,
    lastSpeedingEventAtMs: null,
    hardBrakingEvents: 0,
    speedingEvents: 0,
  };
}

export function speedLimitMpsToMph(mps: number | null | undefined): number | null {
  if (typeof mps !== 'number' || !Number.isFinite(mps) || mps <= 0) return null;
  return mps * 2.2369362921;
}

function speedingThresholdMph(limitMph: number): number {
  return limitMph + Math.max(7, limitMph * 0.15);
}

export function processDriveSafetySample(
  state: DriveSafetyState,
  sample: DriveSafetySample,
): DriveSafetyState {
  if (!sample.isNavigating) return { ...state, lastSampleMs: null, lastSpeedMph: null, speedingSinceMs: null };
  const accuracy = sample.gpsAccuracyM;
  const speed = sample.speedMph;
  if (
    !Number.isFinite(sample.atMs) ||
    !Number.isFinite(speed) ||
    speed < 0 ||
    speed > MAX_REASONABLE_SPEED_MPH ||
    (typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > MAX_GPS_ACCURACY_M)
  ) {
    return state;
  }

  let next = { ...state };
  const prevMs = next.lastSampleMs;
  const prevSpeed = next.lastSpeedMph;
  if (prevMs != null && prevSpeed != null && sample.atMs > prevMs) {
    const elapsedSec = (sample.atMs - prevMs) / 1000;
    if (elapsedSec >= 0.5 && elapsedSec <= 5 && prevSpeed >= HARD_BRAKE_MIN_START_SPEED_MPH) {
      const decel = (prevSpeed - speed) / elapsedSec;
      const sinceLastBrake =
        next.lastHardBrakeAtMs == null ? Number.POSITIVE_INFINITY : sample.atMs - next.lastHardBrakeAtMs;
      if (decel >= HARD_BRAKE_DECEL_MPH_PER_SEC && sinceLastBrake >= HARD_BRAKE_COOLDOWN_MS) {
        next.hardBrakingEvents += 1;
        next.lastHardBrakeAtMs = sample.atMs;
      }
    }
  }

  const limit = sample.speedLimitMph;
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0 && speed >= speedingThresholdMph(limit)) {
    next.speedingSinceMs = next.speedingSinceMs ?? sample.atMs;
    const heldMs = sample.atMs - next.speedingSinceMs;
    const sinceLastSpeeding =
      next.lastSpeedingEventAtMs == null ? Number.POSITIVE_INFINITY : sample.atMs - next.lastSpeedingEventAtMs;
    if (heldMs >= SPEEDING_HOLD_MS && sinceLastSpeeding >= SPEEDING_COOLDOWN_MS) {
      next.speedingEvents += 1;
      next.lastSpeedingEventAtMs = sample.atMs;
    }
  } else {
    next.speedingSinceMs = null;
  }

  next.lastSampleMs = sample.atMs;
  next.lastSpeedMph = speed;
  return next;
}
