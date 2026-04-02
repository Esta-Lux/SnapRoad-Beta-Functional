import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { FriendLocation } from '../../types';

interface Props {
  friends: FriendLocation[];
  onFriendTap?: (f: FriendLocation) => void;
}

/**
 * Friend locations: MarkerView + person icon (avoid PointAnnotation rasterization).
 */
export default React.memo(function FriendMarkers({ friends, onFriendTap }: Props) {
  const visible = friends.filter((f) => f.isSharing && f.lat !== 0 && f.lng !== 0);
  if (!isMapAvailable() || !MapboxGL || !visible.length) return null;
  const MB = MapboxGL;

  return (
    <>
      {visible.map((f) => (
        <MB.MarkerView
          key={f.id}
          id={`fr-mv-${f.id}`}
          coordinate={[f.lng, f.lat]}
          anchor={{ x: 0.5, y: 0.5 }}
          allowOverlap
        >
          <Pressable onPress={() => onFriendTap?.(f)} style={styles.wrap} hitSlop={4}>
            {f.sosActive && <View style={styles.sosRing} pointerEvents="none" />}
            <View style={[styles.puck, f.isFamilyMember && styles.puckFamily]}>
              <Ionicons name={f.isFamilyMember ? 'people' : 'person'} size={20} color="#fff" />
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {(f.name ?? '').split(' ')[0]}
            </Text>
            {(f.speedMph ?? 0) > 5 && (
              <Text style={styles.speed}>{Math.round(f.speedMph ?? 0)} mph</Text>
            )}
          </Pressable>
        </MB.MarkerView>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', minWidth: 56 },
  sosRing: {
    position: 'absolute',
    top: -2,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: '#EF4444',
  },
  puck: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  puckFamily: { backgroundColor: '#3B82F6' },
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
