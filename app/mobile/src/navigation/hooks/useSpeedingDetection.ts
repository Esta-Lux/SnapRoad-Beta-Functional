import { useMemo } from 'react';

export type SpeedingAlert = {
  currentSpeed: number;
  speedLimit: number;
  overBy: number;
  overByPercent: number;
  severity: 'mild' | 'moderate' | 'severe';
  roadType: 'highway' | 'arterial' | 'local';
};

function roadTypeForLimit(limit: number): SpeedingAlert['roadType'] {
  if (limit >= 55) return 'highway';
  if (limit >= 30) return 'arterial';
  return 'local';
}

export function resolveSpeedingAlert(speedMph: number, speedLimitMph?: number | null): SpeedingAlert | null {
  if (speedLimitMph == null || !Number.isFinite(speedMph) || !Number.isFinite(speedLimitMph)) return null;
  const current = Math.round(speedMph);
  const limit = Math.round(speedLimitMph);
  const overBy = current - limit;
  if (overBy <= 5) return null;
  return {
    currentSpeed: current,
    speedLimit: limit,
    overBy,
    overByPercent: limit > 0 ? overBy / limit : 0,
    severity: overBy >= 15 ? 'severe' : overBy >= 10 ? 'moderate' : 'mild',
    roadType: roadTypeForLimit(limit),
  };
}

export function useSpeedingDetection(speedMph: number, speedLimitMph?: number | null): SpeedingAlert | null {
  return useMemo(() => resolveSpeedingAlert(speedMph, speedLimitMph), [speedMph, speedLimitMph]);
}
