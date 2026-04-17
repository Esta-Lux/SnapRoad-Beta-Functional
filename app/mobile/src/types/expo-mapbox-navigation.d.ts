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

  export type MapboxNavigationViewRef = {
    recenterMap: () => void | Promise<void>;
    stopNavigation?: () => void | Promise<void>;
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
    drivingMode?: 'calm' | 'adaptive' | 'sport';
    appTheme?: 'light' | 'dark';
    navigationLogicOnly?: boolean;
    onRouteProgressChanged?: (event: {
      nativeEvent: {
        distanceRemaining: number;
        distanceTraveled: number;
        durationRemaining: number;
        fractionTraveled: number;
        legIndex?: number;
        stepIndex?: number;
        primaryInstruction?: string;
        maneuverType?: string;
        distanceToNextManeuverMeters?: number;
      };
    }) => void;
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
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
    pointerEvents?: import('react-native').ViewProps['pointerEvents'];
  };

  const MapboxNavigationView: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<MapboxNavigationViewProps> & React.RefAttributes<MapboxNavigationViewRef>
  >;

  export { MapboxNavigationView };
}
