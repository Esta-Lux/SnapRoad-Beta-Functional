import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import MapboxGL from '../../utils/mapbox';

/**
 * Navigation puck — "Apple Maps single frame", Reanimated-smoothed.
 *
 * Rendered whenever a nav trip is active (`nav.isNavigating`). While this
 * puck is on screen the default `LocationPuck` (which reads raw device GPS)
 * must be hidden so the two location sources do not visibly fight — see
 * `MapScreen.tsx`.
 *
 * Coordinate + heading source: **`nav.navigationProgressCoord`** /
 * **`nav.navigationDisplayHeading`** from `useDriveNavigation` — which resolve to
 * the on-polyline `routeSplitSnap.point` and the smoothed SDK `course`. Feeding
 * the puck from the raw `navSdkStore.location` would place it ~1–3 m off the
 * rendered route polyline (map-matcher vs client projection mismatch), making
 * the puck appear to slide along the side of the route while the
 * `RouteOverlay`'s traveled/remaining split sat on the line. Both puck and
 * `CustomLocationProvider` (camera anchor) read the same coord now, so puck +
 * camera + route split all render on a single point.
 *
 * ### Why Reanimated rotation (the "puck moves around on its own" fix)
 *
 * The native Navigation SDK publishes matched-location samples at roughly
 * 3–10 Hz (iOS throttled to ~150 ms, Android ~3 Hz for routeProgress). If we
 * apply the resulting `course` directly to a RN `View`'s `transform`, the
 * chevron visibly *steps* between those samples — every ~100–300 ms the
 * rotation jumps by whatever the latest smoothed delta was. That's the
 * "weak / moves around on its own" symptom.
 *
 * Apple Maps hides this by animating rotation on the render thread between
 * samples. We do the same with a Reanimated `SharedValue`:
 *
 *   - Each new `course` prop is eased into the shared value via
 *     `withTiming(…, { duration: 180 })` (matches the iOS throttle period).
 *   - The easing runs on the UI thread — no JS bridge, no JS state updates,
 *     no re-render per frame. The chevron therefore rotates continuously at
 *     the display refresh rate instead of stepping at the SDK cadence.
 *   - Shortest-angle delta handling (below) prevents the 359° → 1° "whirl"
 *     that a naïve `withTiming(next)` call would produce.
 *
 * When the native engine has no course yet (`course < 0`) the arrow holds the
 * last-known valid rotation instead of flashing to north; the first matched
 * location event typically arrives within ~150 ms of the first progress tick
 * on iOS (see `patches/@badatgil+expo-mapbox-navigation+*.patch`).
 */
type Props = {
  /** On-polyline longitude (`navigationProgressCoord.lng`). */
  lng: number;
  /** On-polyline latitude (`navigationProgressCoord.lat`). */
  lat: number;
  /** Smoothed course in degrees from the native SDK (`navigationDisplayHeading`); negative means unknown. */
  course: number;
  /**
   * Optional accent (route color) — defaults to SnapRoad brand blue.
   * Pass `DRIVING_MODES[mode].routeColor` to keep the arrow in lockstep with the route.
   */
  color?: string;
};

/**
 * Returns the smallest signed angle that, when added to `from`, results in
 * the same compass direction as `to`. Prevents the `withTiming` tween from
 * rotating the long way around when heading wraps past north (e.g. 359° → 1°
 * should animate +2°, not −358°).
 */
function shortestAngleDelta(from: number, to: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return diff;
}

function NavSdkPuckImpl({ lng, lat, course, color = '#0A66FF' }: Props) {
  /**
   * Absolute-rotation shared value. We maintain a **continuous** running
   * rotation (can exceed 360° or be negative) so that `withTiming` always
   * interpolates along the shortest angular path. Snapshots of the last
   * target inform the delta computation on every new sample.
   */
  const rotation = useSharedValue(0);
  const lastTargetRef = React.useRef<number | null>(null);
  /**
   * Hold the last known valid `course` so that brief SDK dropouts
   * (course === -1 on the first few ticks, NaN on reroute boundaries) don't
   * cause the chevron to snap to north. Mirrors what Apple Maps does.
   */
  const lastValidCourseRef = React.useRef<number>(0);

  const courseIsValid = course >= 0 && Number.isFinite(course);
  const effectiveCourse = courseIsValid ? course : lastValidCourseRef.current;
  if (courseIsValid) lastValidCourseRef.current = course;

  React.useEffect(() => {
    if (!Number.isFinite(effectiveCourse)) return;
    const prev = lastTargetRef.current;
    if (prev == null) {
      rotation.value = effectiveCourse;
      lastTargetRef.current = effectiveCourse;
      return;
    }
    const delta = shortestAngleDelta(prev, effectiveCourse);
    const nextAbsolute = prev + delta;
    lastTargetRef.current = nextAbsolute;
    rotation.value = withTiming(nextAbsolute, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [effectiveCourse, rotation]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!MapboxGL || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  return (
    <MapboxGL.MarkerView
      id="nav-sdk-puck"
      coordinate={[lng, lat]}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
      // Even though `LocationPuck` is hidden while this puck is authoritative,
      // Mapbox's `ViewAnnotationManager` still reserves a puck collision
      // region at the device GPS point. Without `allowOverlapWithPuck`, the
      // SDK puck can flicker out at high pitch / near 3D landmarks while the
      // reserved region and our matched-location point overlap. See POI
      // markers for the same fix.
      allowOverlapWithPuck
    >
      <View style={styles.wrap} pointerEvents="none">
        {/* Outer ambient glow — static, non-rotating; reads as a confident presence. */}
        <View style={[styles.glow, { backgroundColor: `${color}22` }]} />
        {/* Inner halo with subtle tint. Static too, so only the chevron rotates. */}
        <View style={[styles.halo, { backgroundColor: `${color}44` }]} />
        {/* Solid white disc gives the chevron a crisp edge over any basemap. */}
        <View style={styles.disc} />
        {/* Rotating chevron (SVG) — centre-anchored so rotation pivots on the matched point. */}
        <Animated.View style={[styles.arrow, rotateStyle]}>
          <Svg width={30} height={30} viewBox="0 0 64 64">
            <Defs>
              <LinearGradient id="navPuckFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity={1} />
                <Stop offset="100%" stopColor={color} stopOpacity={0.85} />
              </LinearGradient>
            </Defs>
            {/* Arrow body: broad chevron with a crisp tip (Apple Maps style). */}
            <Path
              d="M32 4 L56 56 L32 44 L8 56 Z"
              fill="url(#navPuckFill)"
              stroke="#FFFFFF"
              strokeWidth={5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Highlight notch for depth. */}
            <Path
              d="M32 16 L44 44 L32 38 L20 44 Z"
              fill="#FFFFFF"
              opacity={0.35}
            />
            {/* Centre dot keeps the puck visually anchored even when rotation
                is in motion — matches Apple Maps' inner white disc. */}
            <Circle cx={32} cy={40} r={3} fill="#FFFFFF" opacity={0.9} />
          </Svg>
        </Animated.View>
      </View>
    </MapboxGL.MarkerView>
  );
}

/**
 * Coord changes at 60 Hz (RAF-smoothed fraction), course at SDK cadence.
 * We let Reanimated handle the rotation smoothing, so the memo only needs
 * to bail out for meaningful coord / color changes. Course prop still
 * re-runs the effect that drives the shared value.
 */
export const NavSdkPuck = React.memo(NavSdkPuckImpl, (prev, next) => {
  if (prev.color !== next.color) return false;
  if (Math.abs(prev.lat - next.lat) > 1e-6) return false;
  if (Math.abs(prev.lng - next.lng) > 1e-6) return false;
  // Rotation is animated on the UI thread via `withTiming`; a small course
  // jitter (< 0.25°) on the same sample shouldn't retrigger the effect.
  if (Math.abs(prev.course - next.course) > 0.25) return false;
  return true;
});

const styles = StyleSheet.create({
  wrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  halo: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  disc: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0A2A5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
  },
  arrow: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NavSdkPuck;
