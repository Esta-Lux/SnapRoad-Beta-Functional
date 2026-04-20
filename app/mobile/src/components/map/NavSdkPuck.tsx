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
  course: number;
  color?: string;
  accuracy?: number | null;
  speedMps?: number;
};

const PREDICTIVE_MS = 80;
const STOPPED_THRESHOLD_MPS = 0.5;
const ACCURACY_RING_THRESHOLD_M = 15;
const ROTATION_EASE_MS = 220;

function shortestAngleDelta(from: number, to: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return diff;
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

const SNAP_JUMP_METERS = 85;

/**
 * Continuous RAF ease toward the latest native coordinate so `MarkerView` glides at ~60fps
 * even when the SDK emits faster than one cubic ease can finish (moving target).
 */
function useSmoothCoordinate(lat: number, lng: number, durationMs: number): { lat: number; lng: number } {
  const targetRef = React.useRef({ lat, lng });
  const displayRef = React.useRef({ lat, lng });
  const [smooth, setSmooth] = React.useState(() => ({ lat, lng }));
  const rafRef = React.useRef<number | null>(null);
  const lastNowRef = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    targetRef.current = { lat, lng };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const d = haversineMeters(displayRef.current.lat, displayRef.current.lng, lat, lng);
    if (d > SNAP_JUMP_METERS) {
      displayRef.current = { lat, lng };
      setSmooth({ lat, lng });
    }
  }, [lat, lng]);

  React.useEffect(() => {
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
  }, [durationMs]);

  return smooth;
}

function NavSdkPuckImpl({
  lng,
  lat,
  course,
  color = '#0A66FF',
  accuracy = null,
  speedMps = 0,
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

  const smoothCoord = useSmoothCoordinate(lat, lng, moving ? 120 : 200);
  const { lat: puckLat, lng: puckLng } = React.useMemo(() => {
    const baseLat = smoothCoord.lat;
    const baseLng = smoothCoord.lng;
    if (!moving || !courseIsValid) return { lat: baseLat, lng: baseLng };
    const meters = Math.max(0, speedMps ?? 0) * (PREDICTIVE_MS / 1000);
    const p = projectAhead(baseLat, baseLng, course, meters);
    return { lat: p.lat, lng: p.lng };
  }, [smoothCoord.lat, smoothCoord.lng, course, courseIsValid, moving, speedMps]);

  React.useEffect(() => {
    if (!Number.isFinite(effectiveCourse)) return;
    const prev = lastTargetRotationRef.current;

    if (!moving) {
      if (prev == null) {
        rotationSv.value = effectiveCourse;
        lastTargetRotationRef.current = effectiveCourse;
      }
      return;
    }

    if (prev == null) {
      rotationSv.value = effectiveCourse;
      lastTargetRotationRef.current = effectiveCourse;
      return;
    }

    const delta = shortestAngleDelta(prev, effectiveCourse);
    const nextAbsolute = prev + delta;
    lastTargetRotationRef.current = nextAbsolute;
    rotationSv.value = withTiming(nextAbsolute, {
      duration: ROTATION_EASE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [effectiveCourse, moving, rotationSv]);

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

  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.32 }));

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

        <Animated.View style={[styles.halo, { backgroundColor: `${color}22` }, haloStyle]} />

        <View style={[styles.glowRing, { backgroundColor: `${color}33` }]} />

        <View style={styles.disc}>
          <View style={[styles.discInner, { backgroundColor: color }]} />
        </View>

        <Animated.View style={[styles.arrow, rotateStyle]}>
          <Svg width={32} height={32} viewBox="0 0 64 64">
            <Defs>
              <LinearGradient id="navPuckFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity={1} />
                <Stop offset="100%" stopColor={color} stopOpacity={0.9} />
              </LinearGradient>
            </Defs>
            <Path
              d="M32 6 L54 52 L32 42 L10 52 Z"
              fill="url(#navPuckFill)"
              stroke="#FFFFFF"
              strokeWidth={4.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <Path d="M32 18 L42 42 L32 37 L22 42 Z" fill="#FFFFFF" opacity={0.3} />
            <Circle cx={32} cy={40} r={2.5} fill="#FFFFFF" opacity={0.95} />
          </Svg>
        </Animated.View>
      </View>
    </MapboxGL.MarkerView>
  );
}

export const NavSdkPuck = React.memo(NavSdkPuckImpl, (prev, next) => {
  if (prev.color !== next.color) return false;
  if (Math.abs(prev.lat - next.lat) > 1e-7) return false;
  if (Math.abs(prev.lng - next.lng) > 1e-7) return false;
  if (Math.abs(prev.course - next.course) > 0.2) return false;
  if (prev.accuracy !== next.accuracy) return false;
  const pStop = (prev.speedMps ?? 0) < STOPPED_THRESHOLD_MPS;
  const nStop = (next.speedMps ?? 0) < STOPPED_THRESHOLD_MPS;
  if (pStop !== nStop) return false;
  return true;
});

const styles = StyleSheet.create({
  wrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  halo: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  glowRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  disc: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  discInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  arrow: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NavSdkPuck;
