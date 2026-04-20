/**
 * Mapbox Navigation SDK (native) → JS bridge helpers for SnapRoad’s headless mode.
 *
 * State and ingestion live in {@link navSdkStore.ts}. {@link useDriveNavigation} subscribes when
 * `EXPO_PUBLIC_NAV_LOGIC_SDK` is enabled. MapScreen mounts a hidden `MapboxNavigationView`
 * with `navigationLogicOnly` and forwards native events into the store.
 */

export {
  getNavSdkState,
  subscribeNavSdk,
  resetNavSdkState,
  enterSdkGuidanceWaiting,
  ingestSdkProgress,
  ingestSdkLocation,
  ingestSdkRoutePolyline,
  ingestSdkRouteChangedEvent,
  ingestSdkVoiceSubtitle,
  markNavVoiceFromJs,
  getSdkNavigationProgress,
  getMinimalSdkNavigationProgress,
  getSdkMatchedCoordinate,
} from './navSdkStore';

export type { SdkProgressPayload, SdkLocationPayload } from './navSdkStore';

export { polylineFromSdkRoutes } from './navSdkGeometry';
export type { SdkRoutesNative } from './navSdkGeometry';
