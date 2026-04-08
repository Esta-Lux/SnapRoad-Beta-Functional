import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { FriendLocation } from '../../types';
import { haversineMeters } from '../../utils/distance';

interface Props {
  friends: FriendLocation[];
  onFriendTap?: (f: FriendLocation) => void;
}

const LERP_MIN_METERS = 4;
const LERP_DURATION_MS = 750;

function useInterpolatedLatLng(lat: number, lng: number): { lat: number; lng: number } {
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
    if (d < LERP_MIN_METERS) {
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
  }, [lat, lng]);

  return display;
}

function InterpolatedFriendMarker({
  MB,
  friend,
  onFriendTap,
}: {
  MB: NonNullable<typeof MapboxGL>;
  friend: FriendLocation;
  onFriendTap?: (f: FriendLocation) => void;
}) {
  const { lat, lng } = useInterpolatedLatLng(friend.lat, friend.lng);

  return (
    <MB.MarkerView
      id={`fr-mv-${friend.id}`}
      coordinate={[lng, lat]}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
    >
      <Pressable onPress={() => onFriendTap?.(friend)} style={styles.wrap} hitSlop={4}>
        {friend.sosActive && <View style={styles.sosRing} pointerEvents="none" />}
        <View style={[styles.avatarOuter, friend.isFamilyMember && styles.avatarOuterFamily]}>
          {friend.avatar ? (
            <Image source={{ uri: friend.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarFallback, friend.isFamilyMember && styles.avatarFallbackFamily]}>
              <Ionicons name={friend.isFamilyMember ? 'people' : 'person'} size={16} color="#fff" />
            </View>
          )}
        </View>
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
export default React.memo(function FriendMarkers({ friends, onFriendTap }: Props) {
  const visible = friends.filter((f) => f.isSharing && f.lat !== 0 && f.lng !== 0);
  if (!isMapAvailable() || !MapboxGL || !visible.length) return null;
  const MB = MapboxGL;

  return (
    <>
      {visible.map((f) => (
        <InterpolatedFriendMarker key={f.id} MB={MB} friend={f} onFriendTap={onFriendTap} />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', minWidth: 56 },
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
