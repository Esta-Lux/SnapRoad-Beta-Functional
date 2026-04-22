import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import MapboxGL from '../../utils/mapbox';
import { haversineMeters } from '../../utils/distance';

/**
 * Headless-nav puck: coordinates + course come from the native SDK via `useDriveNavigation`.
 *
 * - Shortest-angle eased rotation (Reanimated).
 * - Held bearing when nearly stopped.
 * - Light forward projection along course when moving (reduces visual lag).
 * - Pulsing accuracy ring when GPS accuracy is poor.
 */

type Props = {
  lng: number;
  lat: number;
  /** True north ° Clockwise — GPS / SDK course. */
  course: number;
  /**
   * Map camera bearing (° clockwise from north). When set, the chevron rotates by
   * `course - mapBearing` so **forward** stays toward the **top of the screen** in
   * heading-up follow mode, and stays aligned with the road in north-up mode — matching
   * native navigation (MarkerView content is screen-axis, not map-rotated).
   */
  mapBearingDeg?: number | null;
  color?: string;
  accuracy?: number | null;
  speedMps?: number;
  /**
   * When true (native SDK pass-through): place the marker at the exact native
   * matched coordinate — no RAF position ease, no predictive lead-ahead. Keeps
   * Reanimated rotation smoothing only.
   */
  mirrorNativePosition?: boolean;
};

/** No forward lead — keeps the chevron pinned to the snapped fix (matches headless SDK, less “float”). */
const PREDICTIVE_MS = 0;
const STOPPED_THRESHOLD_MPS = 0.5;
const ACCURACY_RING_THRESHOLD_M = 15;
const ROTATION_EASE_MS = 220;

function shortestAngleDelta(from: number, to: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return diff;
}

/** Wrap degrees to [0, 360). */
function normalize360Deg(deg: number): number {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

/** Bearing to use for the on-screen chevron (map rotation compensated). */
function screenBearingDeg(
  courseDeg: number,
  mapBearingDeg: number | null | undefined,
): number {
  if (mapBearingDeg == null || !Number.isFinite(mapBearingDeg)) {
    return normalize360Deg(courseDeg);
  }
  return normalize360Deg(courseDeg - mapBearingDeg);
}

function projectAhead(lat: number, lng: number, headingDeg: number, meters: number) {
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
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

/** Above this, snap the eased position (reroute/teleport). Higher = more glide, less hard snap. */
const SNAP_JUMP_METERS = 165;

/**
 * Continuous RAF ease toward the latest coordinate. When `enabled` is false (native mirror
 * mode), returns `{ lat, lng }` directly and does not run RAF.
 */
function useSmoothCoordinate(
  lat: number,
  lng: number,
  durationMs: number,
  enabled: boolean,
): { lat: number; lng: number } {
  const targetRef = React.useRef({ lat, lng });
  const displayRef = React.useRef({ lat, lng });
  const [smooth, setSmooth] = React.useState(() => ({ lat, lng }));
  const rafRef = React.useRef<number | null>(null);
  const lastNowRef = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    targetRef.current = { lat, lng };
    if (!enabled) {
      displayRef.current = { lat, lng };
      setSmooth({ lat, lng });
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const d = haversineMeters(displayRef.current.lat, displayRef.current.lng, lat, lng);
    if (d > SNAP_JUMP_METERS) {
      displayRef.current = { lat, lng };
      setSmooth({ lat, lng });
    }
  }, [lat, lng, enabled]);

  React.useEffect(() => {
    if (!enabled) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    let cancelled = false;
    lastNowRef.current =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const last = lastNowRef.current ?? now;
      lastNowRef.current = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      const target = targetRef.current;
      const cur = displayRef.current;
      const tau = Math.max(0.04, durationMs / 1000);
      const alpha = 1 - Math.exp(-dt / tau);
      const nx = cur.lat + (target.lat - cur.lat) * alpha;
      const ny = cur.lng + (target.lng - cur.lng) * alpha;
      displayRef.current = { lat: nx, lng: ny };
      setSmooth({ lat: nx, lng: ny });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs, enabled]);

  return enabled ? smooth : { lat, lng };
}

function NavSdkPuckImpl({
  lng,
  lat,
  course,
  mapBearingDeg = null,
  color = '#0A66FF',
  accuracy = null,
  speedMps = 0,
  mirrorNativePosition = false,
}: Props) {
  const rotationSv = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.35);

  const lastTargetRotationRef = React.useRef<number | null>(null);
  const lastValidCourseRef = React.useRef<number>(0);

  const moving = (speedMps ?? 0) >= STOPPED_THRESHOLD_MPS;
  const courseIsValid = course >= 0 && Number.isFinite(course);
  const effectiveCourse = courseIsValid ? course : lastValidCourseRef.current;
  if (courseIsValid) lastValidCourseRef.current = course;

  const orientDeg = React.useMemo(
    () => screenBearingDeg(effectiveCourse, mapBearingDeg),
    [effectiveCourse, mapBearingDeg],
  );

  const positionEaseEnabled = !mirrorNativePosition;
  const smoothCoord = useSmoothCoordinate(lat, lng, moving ? 200 : 280, positionEaseEnabled);
  const { lat: puckLat, lng: puckLng } = React.useMemo(() => {
    const baseLat = mirrorNativePosition ? lat : smoothCoord.lat;
    const baseLng = mirrorNativePosition ? lng : smoothCoord.lng;
    if (mirrorNativePosition || !moving || !courseIsValid) return { lat: baseLat, lng: baseLng };
    const meters = Math.max(0, speedMps ?? 0) * (PREDICTIVE_MS / 1000);
    const p = projectAhead(baseLat, baseLng, course, meters);
    return { lat: p.lat, lng: p.lng };
  }, [
    mirrorNativePosition,
    lat,
    lng,
    smoothCoord.lat,
    smoothCoord.lng,
    course,
    courseIsValid,
    moving,
    speedMps,
  ]);

  React.useEffect(() => {
    if (!Number.isFinite(orientDeg)) return;
    const prev = lastTargetRotationRef.current;

    if (!moving) {
      if (prev == null) {
        rotationSv.value = orientDeg;
        lastTargetRotationRef.current = orientDeg;
      } else {
        const delta = shortestAngleDelta(prev, orientDeg);
        const nextAbsolute = prev + delta;
        lastTargetRotationRef.current = nextAbsolute;
        rotationSv.value = withTiming(nextAbsolute, {
          duration: mapBearingDeg != null && Number.isFinite(mapBearingDeg) ? 120 : ROTATION_EASE_MS,
          easing: Easing.out(Easing.cubic),
        });
      }
      return;
    }

    if (prev == null) {
      rotationSv.value = orientDeg;
      lastTargetRotationRef.current = orientDeg;
      return;
    }

    const delta = shortestAngleDelta(prev, orientDeg);
    const nextAbsolute = prev + delta;
    lastTargetRotationRef.current = nextAbsolute;
    rotationSv.value = withTiming(nextAbsolute, {
      duration: ROTATION_EASE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [orientDeg, moving, rotationSv, mapBearingDeg]);

  const showAccuracyRing = (accuracy ?? 0) > ACCURACY_RING_THRESHOLD_M;
  React.useEffect(() => {
    if (!showAccuracyRing) {
      pulseScale.value = 1;
      pulseOpacity.value = 0;
      return;
    }
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 1200, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.06, { duration: 1200, easing: Easing.out(Easing.quad) }),
        withTiming(0.32, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [showAccuracyRing, pulseOpacity, pulseScale]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationSv.value}deg` }],
  }));

  const accuracyRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  if (!MapboxGL || !Number.isFinite(puckLng) || !Number.isFinite(puckLat)) return null;

  return (
    <MapboxGL.MarkerView
      id="nav-sdk-puck"
      coordinate={[puckLng, puckLat]}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
      allowOverlapWithPuck
    >
      <View style={styles.wrap} pointerEvents="none">
        {showAccuracyRing && (
          <Animated.View
            style={[styles.accuracyRing, { borderColor: `${color}55` }, accuracyRingStyle]}
          />
        )}

        <Animated.View style={[styles.arrow, rotateStyle]}>
          <Svg width={36} height={36} viewBox="0 0 64 64">
            <Defs>
              <LinearGradient id="navPuckFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity={1} />
                <Stop offset="100%" stopColor={color} stopOpacity={0.92} />
              </LinearGradient>
            </Defs>
            <Path
              d="M32 8 L50 48 L32 40 L14 48 Z"
              fill="url(#navPuckFill)"
              stroke="#FFFFFF"
              strokeWidth={3.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <Circle cx={32} cy={38} r={3} fill="#FFFFFF" opacity={0.9} />
          </Svg>
        </Animated.View>
      </View>
    </MapboxGL.MarkerView>
  );
}

export const NavSdkPuck = React.memo(NavSdkPuckImpl, (prev, next) => {
  if (prev.color !== next.color) return false;
  if (prev.mirrorNativePosition !== next.mirrorNativePosition) return false;
  if (Math.abs(prev.lat - next.lat) > 1e-7) return false;
  if (Math.abs(prev.lng - next.lng) > 1e-7) return false;
  if (Math.abs(prev.course - next.course) > 0.2) return false;
  const pb = prev.mapBearingDeg;
  const nb = next.mapBearingDeg;
  if (pb !== nb) {
    if (pb == null || nb == null || !Number.isFinite(pb) || !Number.isFinite(nb)) return false;
    if (Math.abs(pb - nb) > 0.35) return false;
  }
  if (prev.accuracy !== next.accuracy) return false;
  const pStop = (prev.speedMps ?? 0) < STOPPED_THRESHOLD_MPS;
  const nStop = (next.speedMps ?? 0) < STOPPED_THRESHOLD_MPS;
  if (pStop !== nStop) return false;
  return true;
});

const styles = StyleSheet.create({
  /** Tight bounds — map-stuck SVG metaphor (no elevated “widget” stack). */
  wrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.25,
    backgroundColor: 'transparent',
  },
  arrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NavSdkPuck;
