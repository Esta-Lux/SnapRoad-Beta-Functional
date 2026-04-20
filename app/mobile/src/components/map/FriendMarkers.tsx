import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { FriendLocation } from '../../types';
import { haversineMeters } from '../../utils/distance';
import { FRIEND_LOC_STALE_MS, hasValidFriendCoords } from '../../lib/friendPresence';
import { sortAndCapMarkers, type MarkerCoordinate } from './markerDensity';

interface Props {
  friends: FriendLocation[];
  onFriendTap?: (f: FriendLocation) => void;
  zoomLevel: number;
  referenceCoordinate?: MarkerCoordinate | null;
}

const LERP_MIN_METERS = 2;
const LERP_DURATION_MS = 580;

function profileInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  const one = parts[0] || '?';
  return one.slice(0, 2).toUpperCase();
}

function useInterpolatedLatLng(lat: number, lng: number, shouldLerp: boolean): { lat: number; lng: number } {
  const [display, setDisplay] = useState({ lat, lng });
  const displayRef = useRef(display);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const from = displayRef.current;
    const d = haversineMeters(from.lat, from.lng, lat, lng);
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!shouldLerp || d < LERP_MIN_METERS) {
      const next = { lat, lng };
      setDisplay(next);
      displayRef.current = next;
      return;
    }
    const start = globalThis.performance?.now?.() ?? Date.now();
    const fromLat = from.lat;
    const fromLng = from.lng;

    const step = () => {
      const now = globalThis.performance?.now?.() ?? Date.now();
      const t = Math.min(1, (now - start) / LERP_DURATION_MS);
      const ease = 1 - (1 - t) ** 3;
      const nlat = fromLat + (lat - fromLat) * ease;
      const nlng = fromLng + (lng - fromLng) * ease;
      const next = { lat: nlat, lng: nlng };
      setDisplay(next);
      displayRef.current = next;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [lat, lng, shouldLerp]);

  return display;
}

function InterpolatedFriendMarker({
  MB,
  friend,
  onFriendTap,
  allowInterpolation,
}: {
  MB: NonNullable<typeof MapboxGL>;
  friend: FriendLocation;
  onFriendTap?: (f: FriendLocation) => void;
  allowInterpolation: boolean;
}) {
  const last = Date.parse(friend.lastUpdated || '');
  const isFresh = Number.isFinite(last) && Date.now() - last <= FRIEND_LOC_STALE_MS;
  const shouldLerp = allowInterpolation && friend.isSharing && isFresh;
  const { lat, lng } = useInterpolatedLatLng(friend.lat, friend.lng, shouldLerp);

  return (
    <MB.MarkerView
      id={`fr-mv-${friend.id}`}
      coordinate={[lng, lat]}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
      // Keep friend avatars visible above Standard 3D buildings at pitched
      // nav camera angles; otherwise Mapbox's view annotation manager culls
      // them near the puck's collision region.
      allowOverlapWithPuck
    >
      <Pressable onPress={() => onFriendTap?.(friend)} style={styles.wrap} hitSlop={4}>
        {friend.sosActive && <View style={styles.sosRing} pointerEvents="none" />}
        <View style={[styles.avatarOuter, friend.isFamilyMember && styles.avatarOuterFamily]}>
          {friend.avatar ? (
            <Image source={{ uri: friend.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarFallback, friend.isFamilyMember && styles.avatarFallbackFamily]}>
              <Text style={styles.avatarInitials}>{profileInitials(friend.name ?? '')}</Text>
            </View>
          )}
        </View>
        {friend.isNavigating ? (
          <View style={styles.navBadge}>
            <Ionicons name="navigate" size={10} color="#fff" />
          </View>
        ) : null}
        <Text style={styles.name} numberOfLines={1}>
          {(friend.name ?? '').split(' ')[0]}
        </Text>
        {(friend.speedMph ?? 0) > 5 && (
          <Text style={styles.speed}>{Math.round(friend.speedMph ?? 0)} mph</Text>
        )}
      </Pressable>
    </MB.MarkerView>
  );
}

/**
 * Friend locations: MarkerView + circular avatar (MarkerView, not PointAnnotation).
 * Coordinates ease between GPS samples so pins don’t jump.
 */
export default React.memo(function FriendMarkers({
  friends,
  onFriendTap,
  zoomLevel,
  referenceCoordinate = null,
}: Props) {
  // Pins need valid GPS. Show when sharing, or when navigating with a live coordinate (common when share flag lags).
  const visible = sortAndCapMarkers(
    friends
      .filter((f) => hasValidFriendCoords(f.lat, f.lng) && (f.isSharing || f.isNavigating))
      .sort((a, b) => {
        const aPriority = Number(Boolean(a.isNavigating)) * 4 + Number(Boolean(a.isSharing)) * 2;
        const bPriority = Number(Boolean(b.isNavigating)) * 4 + Number(Boolean(b.isSharing)) * 2;
        return bPriority - aPriority;
      }),
    referenceCoordinate,
    zoomLevel,
    'friend',
  );
  if (!isMapAvailable() || !MapboxGL || !visible.length) return null;
  const MB = MapboxGL;

  return (
    <>
      {visible.map((f, idx) => (
        <InterpolatedFriendMarker
          key={f.id}
          MB={MB}
          friend={f}
          onFriendTap={onFriendTap}
          allowInterpolation={idx < 12}
        />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', minWidth: 56, position: 'relative' },
  avatarInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  navBadge: {
    position: 'absolute',
    top: -2,
    right: 4,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sosRing: {
    position: 'absolute',
    top: -2,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  avatarOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 2,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 4,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  avatarOuterFamily: {
    backgroundColor: 'rgba(59,130,246,0.95)',
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8E8ED',
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackFamily: { backgroundColor: '#1D4ED8' },
  name: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
    maxWidth: 72,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  speed: {
    color: '#a5f3fc',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
