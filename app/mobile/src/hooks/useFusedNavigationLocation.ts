import { useEffect, useMemo, useRef } from 'react';
import type { Coordinate } from '../types';
import {
  bearingDeg,
  haversineMeters,
  projectOntoPolylineWithHysteresis,
  type HysteresisMatchState,
  type PolylineMapMatch,
} from '../utils/distance';

export type NavigationQualityState =
  | 'raw_only'
  | 'good'
  | 'weak_gps'
  | 'dead_reckoning'
  | 'off_route';

type TrustedNavState = {
  coord: Coordinate;
  heading: number;
  speedMph: number;
  atMs: number;
};

export type FusedNavigationLocation = {
  rawCoord: Coordinate;
  displayCoord: Coordinate;
  displayHeading: number;
  confidence: number;
  isSnapped: boolean;
  qualityState: NavigationQualityState;
};

type Params = {
  rawCoord: Coordinate;
  rawHeading: number;
  speedMph: number;
  accuracyM: number | null;
  isNavigating: boolean;
  polyline?: Coordinate[] | null;
};

const DEAD_RECKON_MAX_MS = 1800;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function angleDeltaDeg(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function destinationPoint(from: Coordinate, headingDeg: number, distanceMeters: number): Coordinate {
  const R = 6371000;
  const bearing = (headingDeg * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lng1 = (from.lng * Math.PI) / 180;
  const dByR = distanceMeters / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
    Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2),
  );
  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (((lng2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

function isValidCoord(coord: Coordinate): boolean {
  return Number.isFinite(coord.lat) && Number.isFinite(coord.lng);
}

function speedCapFromTrusted(rawSpeedMph: number, prev: TrustedNavState | null): number {
  return Math.max(rawSpeedMph + 22, (prev?.speedMph ?? 0) + 26, 34);
}

export function useFusedNavigationLocation({
  rawCoord,
  rawHeading,
  speedMph,
  accuracyM,
  isNavigating,
  polyline,
}: Params): FusedNavigationLocation {
  const lastTrustedRef = useRef<TrustedNavState | null>(null);
  const lastMatchRef = useRef<HysteresisMatchState | null>(null);
  const lastRawRef = useRef<{ coord: Coordinate; atMs: number } | null>(null);

  const fused = useMemo((): FusedNavigationLocation => {
    const now = Date.now();
    const prevTrusted = lastTrustedRef.current;
    const prevRaw = lastRawRef.current;
    const validRaw = isValidCoord(rawCoord) && (Math.abs(rawCoord.lat) > 1e-6 || Math.abs(rawCoord.lng) > 1e-6);

    if (!isNavigating || !validRaw || !polyline || polyline.length < 2) {
      return {
        rawCoord,
        displayCoord: rawCoord,
        displayHeading: rawHeading,
        confidence: validRaw ? 1 : 0,
        isSnapped: false,
        qualityState: 'raw_only',
      };
    }

    const rawDeltaMs = prevRaw ? Math.max(1, now - prevRaw.atMs) : 1000;
    const rawJumpMeters = prevRaw ? haversineMeters(prevRaw.coord.lat, prevRaw.coord.lng, rawCoord.lat, rawCoord.lng) : 0;
    const observedMph = rawDeltaMs > 0 ? (rawJumpMeters / (rawDeltaMs / 1000)) * 2.23694 : speedMph;
    const headingForMatch =
      rawJumpMeters > 2 && prevRaw
        ? bearingDeg(prevRaw.coord, rawCoord)
        : rawHeading;

    const matched = projectOntoPolylineWithHysteresis(rawCoord, polyline, {
      prevMatch: lastMatchRef.current,
      headingDeg: Number.isFinite(headingForMatch) ? headingForMatch : undefined,
      maxBackwardMeters: speedMph > 35 ? 18 : speedMph > 12 ? 10 : 5,
      hysteresisMeters: speedMph > 35 ? 14 : speedMph > 15 ? 10 : 7,
      segmentWindow: speedMph > 35 ? 18 : 12,
    });

    const routeHeading =
      matched && matched.segmentIndex < polyline.length - 1
        ? bearingDeg(polyline[matched.segmentIndex]!, polyline[matched.segmentIndex + 1]!)
        : rawHeading;
    const headingDelta =
      matched && Number.isFinite(headingForMatch)
        ? angleDeltaDeg(routeHeading, headingForMatch)
        : 0;
    const dtTrustedMs = prevTrusted ? Math.max(1, now - prevTrusted.atMs) : 1000;
    const jumpFromTrusted = prevTrusted
      ? haversineMeters(prevTrusted.coord.lat, prevTrusted.coord.lng, rawCoord.lat, rawCoord.lng)
      : rawJumpMeters;
    const trustedObservedMph = dtTrustedMs > 0 ? (jumpFromTrusted / (dtTrustedMs / 1000)) * 2.23694 : observedMph;

    let confidence = 1;
    if (accuracyM == null || !Number.isFinite(accuracyM)) confidence -= 0.1;
    else if (accuracyM > 85) confidence -= 0.46;
    else if (accuracyM > 55) confidence -= 0.28;
    else if (accuracyM > 30) confidence -= 0.14;

    if (matched?.distanceToRouteMeters != null) {
      if (matched.distanceToRouteMeters > 60) confidence -= 0.42;
      else if (matched.distanceToRouteMeters > 38) confidence -= 0.24;
      else if (matched.distanceToRouteMeters > 22) confidence -= 0.1;
    }

    if (trustedObservedMph > speedCapFromTrusted(speedMph, prevTrusted)) confidence -= 0.32;
    if (speedMph < 8 && jumpFromTrusted > 110) confidence -= 0.36;
    if (speedMph > 7 && headingDelta > 95) confidence -= 0.2;
    else if (speedMph > 7 && headingDelta > 70) confidence -= 0.12;
    if (prevTrusted && dtTrustedMs > 2500) confidence -= 0.1;

    confidence = clamp01(confidence);

    const offRouteThreshold = speedMph > 40 ? 72 : speedMph > 18 ? 58 : 44;
    const isOffRoute = !matched || matched.distanceToRouteMeters > offRouteThreshold;
    const snapAllowed = !!matched && matched.distanceToRouteMeters <= 34;

    if (!isOffRoute && snapAllowed && confidence >= 0.45) {
      const displayHeading =
        speedMph > 5
          ? routeHeading
          : prevTrusted
            ? prevTrusted.heading + (((routeHeading - prevTrusted.heading + 540) % 360) - 180) * 0.3
            : routeHeading;
      return {
        rawCoord,
        displayCoord: matched.snapCoord,
        displayHeading: ((displayHeading % 360) + 360) % 360,
        confidence,
        isSnapped: true,
        qualityState: confidence >= 0.62 ? 'good' : 'weak_gps',
      };
    }

    const canDeadReckon =
      !!prevTrusted &&
      !!matched &&
      matched.distanceToRouteMeters <= offRouteThreshold &&
      dtTrustedMs <= DEAD_RECKON_MAX_MS &&
      confidence < 0.45;

    if (canDeadReckon) {
      const distanceMeters = Math.min(26, Math.max(0, prevTrusted.speedMph * 0.44704 * (dtTrustedMs / 1000)));
      const projected = destinationPoint(prevTrusted.coord, prevTrusted.heading, distanceMeters);
      const predictedMatch = projectOntoPolylineWithHysteresis(projected, polyline, {
        prevMatch: lastMatchRef.current,
        headingDeg: prevTrusted.heading,
        maxBackwardMeters: 8,
        hysteresisMeters: 8,
        segmentWindow: 10,
      });
      const displayCoord =
        predictedMatch && predictedMatch.distanceToRouteMeters <= offRouteThreshold
          ? predictedMatch.snapCoord
          : projected;
      const displayHeading =
        predictedMatch && predictedMatch.segmentIndex < polyline.length - 1
          ? bearingDeg(polyline[predictedMatch.segmentIndex]!, polyline[predictedMatch.segmentIndex + 1]!)
          : prevTrusted.heading;
      return {
        rawCoord,
        displayCoord,
        displayHeading,
        confidence: Math.max(0.28, confidence * 0.78),
        isSnapped: !!predictedMatch && predictedMatch.distanceToRouteMeters <= 42,
        qualityState: 'dead_reckoning',
      };
    }

    return {
      rawCoord,
      displayCoord: rawCoord,
      displayHeading: rawHeading,
      confidence: isOffRoute ? Math.min(confidence, 0.26) : confidence,
      isSnapped: false,
      qualityState: isOffRoute ? 'off_route' : 'raw_only',
    };
  }, [accuracyM, isNavigating, polyline, rawCoord, rawHeading, speedMph]);

  useEffect(() => {
    const now = Date.now();
    lastRawRef.current = { coord: rawCoord, atMs: now };
    if (!isNavigating) {
      lastTrustedRef.current = null;
      lastMatchRef.current = null;
      return;
    }
    if (fused.isSnapped) {
      const match = projectOntoPolylineWithHysteresis(fused.displayCoord, polyline ?? [], {
        prevMatch: lastMatchRef.current,
        headingDeg: fused.displayHeading,
        maxBackwardMeters: 8,
        hysteresisMeters: 6,
        segmentWindow: 8,
      });
      if (match) {
        lastMatchRef.current = {
          segmentIndex: match.segmentIndex,
          cumFromStartMeters: match.cumFromStartMeters,
        };
      }
    } else if (fused.qualityState === 'off_route') {
      lastMatchRef.current = null;
    }
    if (fused.qualityState === 'good' || fused.qualityState === 'weak_gps' || fused.qualityState === 'dead_reckoning') {
      lastTrustedRef.current = {
        coord: fused.displayCoord,
        heading: fused.displayHeading,
        speedMph,
        atMs: now,
      };
    }
  }, [fused, isNavigating, polyline, rawCoord, speedMph]);

  return fused;
}
