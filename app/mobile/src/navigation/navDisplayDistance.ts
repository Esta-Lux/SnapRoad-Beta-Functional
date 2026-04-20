import type { NativeFormattedDistance } from './navSdkMirrorTypes';

/**
 * Turn card distance: when mirroring native, prefer locale-formatted strings from the SDK bridge.
 */
export function resolveDisplayDistance(
  isNativeMirror: boolean | undefined,
  nativeFormattedDistance: NativeFormattedDistance | null | undefined,
  distanceValue: string,
  distanceUnit: string,
): { value: string; unit: string } {
  if (isNativeMirror && nativeFormattedDistance?.value?.trim()) {
    return {
      value: nativeFormattedDistance.value.trim(),
      unit: (nativeFormattedDistance.unit ?? '').trim(),
    };
  }
  return { value: distanceValue, unit: distanceUnit };
}
