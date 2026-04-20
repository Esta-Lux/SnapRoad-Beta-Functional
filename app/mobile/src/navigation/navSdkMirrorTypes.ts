/**
 * Native mirror bridge — optional payloads from Mapbox Navigation SDK (iOS/Android).
 * Keep in sync with `sdkNavBridgePayload` + native `navProgressPayload` / dedicated events.
 */

export type SdkCameraPadding = {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

/** Emitted by native `onCameraStateChanged` or embedded in `onRouteProgressChanged`. */
export type SdkCameraPayload = {
  center: { latitude: number; longitude: number };
  zoom: number;
  pitch: number;
  bearing: number;
  padding?: SdkCameraPadding;
};

/** Locale-aware distance from native (replaces JS `formatTurnDistanceForCard` when set). */
export type NativeFormattedDistance = {
  value: string;
  unit: string;
};

/** Per-lane PNG from native lane visuals (replaces SVG paths when aligned with `lanes.length`). */
export type NativeLaneAsset = {
  indication: string;
  active: boolean;
  preferred: boolean;
  imageBase64: string;
  width?: number;
  height?: number;
};

export function isValidSdkCameraPayload(p: SdkCameraPayload | null | undefined): boolean {
  if (!p?.center) return false;
  const { latitude: lat, longitude: lng } = p.center;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Number.isFinite(p.zoom) &&
    Number.isFinite(p.pitch) &&
    Number.isFinite(p.bearing)
  );
}
