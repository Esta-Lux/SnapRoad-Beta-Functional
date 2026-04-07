/**
 * Mode-aware follow-camera tuning (browse vs calm / adaptive / sport).
 * MapScreen continues to use {@link getCameraPreset} from useNavigationCamera for padding/zoom;
 * these tokens document pitch/zoom deltas for future fusion with {@link projectAhead}.
 */

export type NavMode = 'browse' | 'calm' | 'adaptive' | 'sport';

export type CameraConfig = {
  zoom: number;
  pitch: number;
  animationDuration: number;
  headingSmoothing: number;
  lookAheadMeters: number;
};

export function getCameraConfig(mode: NavMode, speedMps: number): CameraConfig {
  switch (mode) {
    case 'calm':
      return {
        zoom: speedMps > 18 ? 14.4 : 15.3,
        pitch: 35,
        animationDuration: 700,
        headingSmoothing: 0.12,
        lookAheadMeters: 80,
      };
    case 'sport':
      return {
        zoom: speedMps > 18 ? 13.8 : 14.8,
        pitch: 58,
        animationDuration: 380,
        headingSmoothing: 0.22,
        lookAheadMeters: 135,
      };
    case 'adaptive':
      return {
        zoom: speedMps > 22 ? 14.0 : speedMps > 10 ? 14.8 : 15.8,
        pitch: speedMps > 18 ? 52 : 42,
        animationDuration: 480,
        headingSmoothing: 0.18,
        lookAheadMeters: speedMps > 18 ? 120 : 90,
      };
    case 'browse':
    default:
      return {
        zoom: 15.5,
        pitch: 20,
        animationDuration: 650,
        headingSmoothing: 0.1,
        lookAheadMeters: 40,
      };
  }
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
