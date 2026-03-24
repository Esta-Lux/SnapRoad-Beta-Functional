import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  instruction: string;
  distance: string;
  maneuver?: string;
  nextInstruction?: string;
  colors: ThemeColors;
}

function turnIcon(maneuver?: string) {
  if (maneuver?.includes('left')) return 'arrow-back' as const;
  if (maneuver?.includes('right')) return 'arrow-forward' as const;
  if (maneuver === 'roundabout') return 'sync-outline' as const;
  if (maneuver === 'u-turn') return 'return-down-back-outline' as const;
  return 'arrow-up' as const;
}

export default function TurnCard({ instruction, distance, maneuver, nextInstruction, colors }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
        <Ionicons name={turnIcon(maneuver)} size={28} color="#fff" />
      </View>
      <View style={styles.textBox}>
        <Text style={[styles.distance, { color: colors.primary }]}>{distance}</Text>
        <Text style={[styles.instruction, { color: colors.text }]} numberOfLines={2}>{instruction}</Text>
        {nextInstruction && <Text style={[styles.then, { color: colors.textTertiary }]} numberOfLines={1}>Then: {nextInstruction}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, flexDirection: 'row', padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  iconBox: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textBox: { flex: 1 },
  distance: { fontSize: 16, fontWeight: '800' },
  instruction: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  then: { fontSize: 11, marginTop: 4 },
});
