import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { FriendLocation } from '../../types';

interface Props {
  friends: FriendLocation[];
  onFriendTap?: (friend: FriendLocation) => void;
}

export default function FriendMarkers({ friends, onFriendTap }: Props) {
  const visible = friends.filter((f) => f.isSharing && f.lat !== 0 && f.lng !== 0);

  if (!isMapAvailable() || !MapboxGL || !visible.length) return null;
  const MBAnnotation = MapboxGL.PointAnnotation;

  return (
    <>
      {visible.map((f) => (
        <MBAnnotation
          key={f.id}
          id={`friend-${f.id}`}
          coordinate={[f.lng, f.lat]}
          onSelected={() => onFriendTap?.(f)}
        >
          <View style={styles.marker}>
            <Text style={styles.initial}>{(f.name ?? 'F')[0]}</Text>
          </View>
        </MBAnnotation>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  initial: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
