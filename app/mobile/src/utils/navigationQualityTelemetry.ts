import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Sentry from '@sentry/react-native';

export type NavigationQualitySample = {
  accuracyBand: 0 | 1 | 2 | 3 | 4 | 5;
  offsetBand: 0 | 1 | 2 | 3 | 4;
  progressBucket: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  speedBand: 0 | 1 | 2 | 3 | 4;
  osBucket: string;
  qualityState: string;
  snapped: 0 | 1;
  confidenceBucket: 0 | 1 | 2 | 3 | 4;
};

export type NavigationQualityEvent = NavigationQualitySample & {
  event: 'reroute' | 'severe_off_route';
};

function compactPayload(payload: NavigationQualitySample | NavigationQualityEvent): Record<string, unknown> {
  return {
    acc: payload.accuracyBand,
    off: payload.offsetBand,
    prog: payload.progressBucket,
    spd: payload.speedBand,
    os: payload.osBucket,
    qs: payload.qualityState,
    snap: payload.snapped,
    conf: payload.confidenceBucket,
    ...(Object.prototype.hasOwnProperty.call(payload, 'event')
      ? { evt: (payload as NavigationQualityEvent).event }
      : {}),
  };
}

export function deviceOsBucket(): string {
  const osVersion = String(Device.osVersion ?? '').split('.')[0] || '0';
  return `${Platform.OS}:${osVersion}`;
}

export function bucketAccuracyBand(accuracyM: number | null | undefined): 0 | 1 | 2 | 3 | 4 | 5 {
  if (accuracyM == null || !Number.isFinite(accuracyM)) return 0;
  if (accuracyM < 15) return 1;
  if (accuracyM < 30) return 2;
  if (accuracyM < 50) return 3;
  if (accuracyM < 75) return 4;
  return 5;
}

export function bucketOffsetBand(offsetM: number): 0 | 1 | 2 | 3 | 4 {
  if (offsetM < 5) return 0;
  if (offsetM < 12) return 1;
  if (offsetM < 25) return 2;
  if (offsetM < 40) return 3;
  return 4;
}

export function bucketSpeedBand(speedMph: number): 0 | 1 | 2 | 3 | 4 {
  if (speedMph < 5) return 0;
  if (speedMph < 15) return 1;
  if (speedMph < 28) return 2;
  if (speedMph < 45) return 3;
  return 4;
}

export function bucketProgress(progress01: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  const clamped = Math.max(0, Math.min(0.999, progress01));
  return Math.floor(clamped * 10) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export function bucketConfidence(confidence: number): 0 | 1 | 2 | 3 | 4 {
  if (confidence < 0.2) return 0;
  if (confidence < 0.4) return 1;
  if (confidence < 0.6) return 2;
  if (confidence < 0.8) return 3;
  return 4;
}

export function trackNavigationQualitySample(sample: NavigationQualitySample): void {
  const payload = compactPayload(sample);
  if (__DEV__) {
    console.info('[nav-quality]', payload);
    return;
  }
  Sentry.logger.info('nav_quality', payload);
}

export function trackNavigationQualityEvent(event: NavigationQualityEvent): void {
  const payload = compactPayload(event);
  if (__DEV__) {
    console.info('[nav-quality-event]', payload);
    return;
  }
  Sentry.logger.info('nav_quality_event', payload);
}
