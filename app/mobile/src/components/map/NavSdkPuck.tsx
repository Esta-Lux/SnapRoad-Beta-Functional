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
/**
 * Rotation easing — kept short on purpose. The upstream stabilizer
 * (`navPuckSync.resolvePuckHeading`) already rate-limits heading change
 * per published frame, so a long timing window here just *delays* a
 * stabilized target and makes the arrow visibly lag the user's actual
 * heading at the start of a turn. 110ms moving / 60ms stopped feels
 * crisp without ever showing a hard snap.
 */
const ROTATION_EASE_MS = 185;
const ROTATION_EASE_STOPPED_MS = 95;
/** A previously-valid `course` becomes stale this fast — never reuse beyond it. */
const STALE_COURSE_AFTER_MS = 1500;

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
const SNAP_JUMP_METERS = 220;

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
  /**
   * Last valid `course` and **when** it was observed. We *only* reuse
   * this within {@link STALE_COURSE_AFTER_MS}; beyond that we hand back
   * the current rotation target so the arrow doesn't pop to a heading
   * that is several seconds stale (tunnel exits, indoor parking, etc.).
   */
  const lastValidCourseRef = React.useRef<{ deg: number; atMs: number } | null>(null);

  const moving = (speedMps ?? 0) >= STOPPED_THRESHOLD_MPS;
  const courseIsValid = course >= 0 && Number.isFinite(course);
  const nowMs = Date.now();
  if (courseIsValid) {
    lastValidCourseRef.current = { deg: course, atMs: nowMs };
  }
  let effectiveCourse: number | null = courseIsValid ? course : null;
  if (effectiveCourse == null && lastValidCourseRef.current) {
    const { deg, atMs } = lastValidCourseRef.current;
    if (nowMs - atMs <= STALE_COURSE_AFTER_MS) effectiveCourse = deg;
  }

  const orientDeg = React.useMemo(() => {
    if (effectiveCourse == null || !Number.isFinite(effectiveCourse)) return null;
    return screenBearingDeg(effectiveCourse, mapBearingDeg);
  }, [effectiveCourse, mapBearingDeg]);

  const positionEaseEnabled = !mirrorNativePosition;
  /** Longer τ than earlier builds so MarkerView coords ease more visibly between RAF frames (fraction smoothing still leads). */
  const smoothCoord = useSmoothCoordinate(lat, lng, moving ? 620 : 720, positionEaseEnabled);
  const { lat: puckLat, lng: puckLng } = React.useMemo(() => {
    const baseLat = mirrorNativePosition ? lat : smoothCoord.lat;
    const baseLng = mirrorNativePosition ? lng : smoothCoord.lng;
    if (mirrorNativePosition || !moving || !courseIsValid) return { lat: baseLat, lng: baseLng };
    const meters = Math.max(0, speedMps ?? 0) * (PREDICTIVE_MS / 1000);
    if (meters <= 0) return { lat: baseLat, lng: baseLng };
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
    if (orientDeg == null || !Number.isFinite(orientDeg)) {
      // No usable heading right now — hold the previous rotation so the
      // arrow doesn't snap or fall back to north.
      return;
    }
    const prev = lastTargetRotationRef.current;

    if (prev == null) {
      rotationSv.value = orientDeg;
      lastTargetRotationRef.current = orientDeg;
      return;
    }

    const delta = shortestAngleDelta(prev, orientDeg);
    const nextAbsolute = prev + delta;
    lastTargetRotationRef.current = nextAbsolute;
    rotationSv.value = withTiming(nextAbsolute, {
      duration: moving ? ROTATION_EASE_MS : ROTATION_EASE_STOPPED_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [orientDeg, moving, rotationSv]);

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
        <View style={styles.puckDisc} />
        {showAccuracyRing && (
          <Animated.View
            style={[styles.accuracyRing, { borderColor: `${color}55` }, accuracyRingStyle]}
          />
        )}

        <Animated.View style={[styles.arrow, rotateStyle]}>
          <Svg width={42} height={42} viewBox="0 0 64 64">
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
  if (haversineMeters(prev.lat, prev.lng, next.lat, next.lng) > 0.18) return false;
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
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puckDisc: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    // No elevation/shadow — MarkerView reads as a flat decal on the basemap instead of a “floating HUD tile”.
    shadowOpacity: 0,
    elevation: 0,
  },
  accuracyRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.25,
    backgroundColor: 'transparent',
  },
  arrow: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NavSdkPuck;
