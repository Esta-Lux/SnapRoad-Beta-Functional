import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { FriendLocation } from '../../types';

interface Props {
  friends: FriendLocation[];
  onFriendTap?: (f: FriendLocation) => void;
}

export default React.memo(function FriendMarkers({ friends, onFriendTap }: Props) {
  const visible = friends.filter((f) => f.isSharing && f.lat !== 0 && f.lng !== 0);
  if (!isMapAvailable() || !MapboxGL || !visible.length) return null;
  const PA = MapboxGL.PointAnnotation;

  return (
    <>
      {visible.map((f) => (
        <PA key={f.id} id={`fr-${f.id}`} coordinate={[f.lng, f.lat]} onSelected={() => onFriendTap?.(f)}>
          <View style={S.wrap}>
            {f.sosActive && <View style={S.sos} />}
            <View style={[S.dot, f.isFamilyMember && S.family]}>
              <Text style={S.init}>{(f.name ?? 'F')[0]}</Text>
            </View>
            <Text style={S.name} numberOfLines={1}>{(f.name ?? '').split(' ')[0]}</Text>
            {(f.speedMph ?? 0) > 5 && <Text style={S.speed}>{Math.round(f.speedMph ?? 0)} mph</Text>}
          </View>
        </PA>
      ))}
    </>
  );
});

const S = StyleSheet.create({
  wrap: { alignItems: 'center', width: 60 },
  dot: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#8B5CF6',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  family: { backgroundColor: '#3B82F6' },
  sos: {
    position: 'absolute', top: -4, left: -4, width: 42, height: 42, borderRadius: 21,
    borderWidth: 3, borderColor: '#EF4444',
  },
  init: { color: '#fff', fontSize: 14, fontWeight: '800' },
  name: {
    color: '#fff', fontSize: 9, fontWeight: '700', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  speed: {
    color: '#a5f3fc', fontSize: 8, fontWeight: '700', marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
});
