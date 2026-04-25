import type { NativeFormattedDistance } from './navSdkMirrorTypes';

/**
 * Turn card distance: for headless SDK, `nativeFormattedDistance` is already US imperial from
 * {@link import('./sdkNavBridgePayload').sdkManeuverDisplayDistanceFromProgress} (meters → value + unit).
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
