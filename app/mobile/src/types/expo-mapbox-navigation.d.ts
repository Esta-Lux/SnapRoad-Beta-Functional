/**
 * Augments `@badatgil/expo-mapbox-navigation` — keep `SdkNavProgressEvent` aligned with
 * `src/navigation/sdkNavBridgePayload.ts` and native `navProgressPayload` implementations.
 */
declare module '@badatgil/expo-mapbox-navigation' {
  type SdkRouteShapePoint = { latitude: number; longitude: number };
  type SdkRoutesNative = {
    mainRoute: {
      distance: number;
      expectedTravelTime: number;
      legs: Array<{
        steps: Array<{
          shape?: { coordinates: SdkRouteShapePoint[] };
        }>;
      }>;
    };
    alternativeRoutes: unknown[];
  };

  /** Same shape as `SdkNavProgressEvent` / `SdkProgressPayload` in `sdkNavBridgePayload.ts`. */
  export type SdkNavProgressLane = {
    indications: string[];
    active: boolean;
    valid: boolean;
  };

  export type SdkNavProgressShield = {
    text: string;
    imageBase64?: string;
  };

  export type SdkCameraPadding = {
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
  };

  export type SdkCameraPayload = {
    center: { latitude: number; longitude: number };
    zoom: number;
    pitch: number;
    bearing: number;
    padding?: SdkCameraPadding;
  };

  export type NativeLaneAsset = {
    indication: string;
    active: boolean;
    preferred: boolean;
    imageBase64: string;
    width?: number;
    height?: number;
  };

  export type SdkNavProgressEvent = {
    distanceRemaining: number;
    distanceTraveled: number;
    durationRemaining: number;
    fractionTraveled: number;
    legIndex?: number;
    stepIndex?: number;
    primaryInstruction?: string;
    secondaryInstruction?: string;
    maneuverType?: string;
    maneuverDirection?: string;
    distanceToNextManeuverMeters?: number;
    speedLimitMps?: number;
    thenInstruction?: string;
    currentStepInstruction?: string;
    upcomingIntersectionName?: string;
    currentRoadName?: string;
    lanes?: SdkNavProgressLane[];
    shield?: SdkNavProgressShield | null;
    primaryDistanceFormatted?: string;
    formattedDistance?: string;
    formattedDistanceUnit?: string;
    cameraState?: SdkCameraPayload;
    laneAssets?: NativeLaneAsset[];
  };

  export type MapboxNavigationViewRef = {
    recenterMap: () => void | Promise<void>;
    stopNavigation: () => void | Promise<void>;
  };

  export type MapboxNavigationViewProps = {
    ref?: React.Ref<MapboxNavigationViewRef>;
    coordinates: Array<{ latitude: number; longitude: number }>;
    waypointIndices?: number[];
    useRouteMatchingApi?: boolean;
    locale?: string;
    routeProfile?: string;
    routeExcludeList?: string[];
    mapStyle?: string;
    mute?: boolean;
    vehicleMaxHeight?: number;
    vehicleMaxWidth?: number;
    initialLocation?: { latitude: number; longitude: number; zoom?: number };
    customRasterSourceUrl?: string;
    placeCustomRasterLayerAbove?: string;
    disableAlternativeRoutes?: boolean;
    followingZoom?: number;
    followingPitch?: number;
    /** JSON string: array of `{ lat, lng, id?, name? }` for OHGO cameras drawn on the embedded map */
    trafficCameras?: string;
    drivingMode?: 'calm' | 'adaptive' | 'sport';
    appTheme?: 'light' | 'dark';
    /**
     * JSON: maneuverBg, maneuverText, maneuverAccent, statsBg, statsText, statsAccent, statsBorder (hex #RRGGBB).
     * When set, native turn + bottom stats chrome use these instead of built-in mode palettes.
     */
    navChromeThemeJson?: string;
    navigationLogicOnly?: boolean;
    onRouteProgressChanged?: (event: { nativeEvent: SdkNavProgressEvent }) => void;
    /** Native navigation camera viewport — mirror RN map `setCamera` when the bridge emits it. */
    onCameraStateChanged?: (event: { nativeEvent: SdkCameraPayload }) => void;
    /** Native-rendered lane bitmaps — same order as banner `lanes` when lengths match. */
    onLaneVisualsChanged?: (event: { nativeEvent: { lanes?: NativeLaneAsset[] } }) => void;
    onCancelNavigation?: () => void;
    onWaypointArrival?: (event: { nativeEvent: Record<string, unknown> | undefined }) => void;
    onFinalDestinationArrival?: () => void;
    onRouteChanged?: (event: { nativeEvent: { reason?: string; routes?: SdkRoutesNative } }) => void;
    onUserOffRoute?: (event: { nativeEvent: Record<string, unknown> }) => void;
    onRoutesLoaded?: (event: { nativeEvent: { routes: SdkRoutesNative } }) => void;
    onRouteFailedToLoad?: (event: { nativeEvent: { errorMessage: string } }) => void;
    onNavigationLocationUpdate?: (event: {
      nativeEvent: {
        latitude: number;
        longitude: number;
        course: number;
        speed: number;
        horizontalAccuracy: number;
        timestamp: number;
        speedLimitMps?: number;
      };
    }) => void;
    onVoiceInstruction?: (event: { nativeEvent: { text: string; distanceAlongStep?: number } }) => void;
    onNavigatorError?: (event: { nativeEvent: { message: string } }) => void;
    onTrafficCameraTap?: (event: { nativeEvent: { id?: string; name?: string } }) => void;
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
    pointerEvents?: import('react-native').ViewProps['pointerEvents'];
  };

  const MapboxNavigationView: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<MapboxNavigationViewProps> & React.RefAttributes<MapboxNavigationViewRef>
  >;

  export { MapboxNavigationView };
}
