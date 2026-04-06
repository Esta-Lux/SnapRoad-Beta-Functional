import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { DirectionsResult } from '../../lib/directions';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  routes: DirectionsResult[];
  selectedIndex: number;
  onSelect: (routeType: 'best' | 'eco' | 'alt') => void;
  colors: ThemeColors;
}

export default function RouteOptions({ routes, selectedIndex, onSelect, colors }: Props) {
  if (routes.length === 0) return null;

  return (
    <View style={styles.row}>
      {routes.slice(0, 2).map((route, i) => {
        const label =
          route.routeType === 'eco' ? 'Eco' : route.routeType === 'alt' ? 'Alt' : 'Best route';
        const selected = selectedIndex === i;
        return (
          <TouchableOpacity
            key={i}
            style={[styles.btn, { backgroundColor: selected ? colors.primary : colors.surfaceSecondary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(route.routeType ?? 'best'); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, { color: selected ? '#fff' : colors.text }]}>{label}</Text>
            <Text style={[styles.sub, { color: selected ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
              {route.durationText} / {route.distanceText}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 11, marginTop: 2 },
});
