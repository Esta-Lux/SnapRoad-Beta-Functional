import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  speed: number;
  speedLimit?: number;
  colors: ThemeColors;
}

export default function SpeedIndicator({ speed, speedLimit, colors }: Props) {
  const rounded = Math.round(speed);
  const overLimit = speedLimit != null && rounded > speedLimit;
  const nearLimit = speedLimit != null && rounded > speedLimit * 0.9;
  const badgeColor = overLimit ? colors.danger : nearLimit ? colors.warning : colors.card;
  const textColor = overLimit || nearLimit ? '#fff' : colors.text;

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor }]}>
      <Text style={[styles.value, { color: textColor }]}>{rounded}</Text>
      <Text style={[styles.unit, { color: overLimit ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}>mph</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  value: { fontSize: 18, fontWeight: '800' },
  unit: { fontSize: 9, marginTop: -2 },
});
