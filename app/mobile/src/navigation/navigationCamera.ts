/**
 * Follow-camera helpers: {@link getCameraConfig} + {@link projectAhead} live in
 * {@link navModeProfile} / this module so MapScreen + {@link cameraPresets} share one tuning tree.
 */

import type { DrivingMode } from '../types';

export type { NavMode, CameraConfig } from './navModeProfile';
export { getCameraConfig } from './navModeProfile';

/**
 * Apple Maps–style camera lead: offset the follow anchor forward along the course so
 * more road ahead is visible at speed; tapers near an upcoming maneuver.
 */
export function getLookAheadMeters(
  mode: DrivingMode,
  speedMps: number,
  nextManeuverDistanceMeters?: number,
): number {
  if (
    nextManeuverDistanceMeters != null &&
    Number.isFinite(nextManeuverDistanceMeters) &&
    nextManeuverDistanceMeters < 60
  ) {
    return Math.max(0, Math.min(28, nextManeuverDistanceMeters * 0.35));
  }
  const mph = Math.max(0, speedMps) * 2.236936;
  if (mph < 3) return 0;
  const crawl01 = Math.min(1, (mph - 3) / 9);
  if (mode === 'sport') return Math.min(96, (8 + mph * 1.05) * crawl01);
  if (mode === 'adaptive') return Math.min(78, (6 + mph * 0.82) * crawl01);
  return Math.min(58, (4 + mph * 0.62) * crawl01);
}

export function projectAhead(lat: number, lng: number, headingDeg: number, meters: number) {
  const R = 6378137;
  const brng = (headingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const d = meters / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lng2 * 180) / Math.PI,
  };
}
