import React from 'react';
import { View, StyleSheet } from 'react-native';
import LaneArrow from './LaneArrow';

interface Lane {
  indications: string[];
  valid: boolean;
}

interface Props {
  lanes?: string;
  activeColor?: string;
  inactiveColor?: string;
}

export default function LaneGuide({
  lanes,
  activeColor = '#ffffff',
  inactiveColor = 'rgba(255,255,255,0.25)',
}: Props) {
  if (!lanes) return null;

  let parsed: Lane[];
  try {
    parsed = JSON.parse(lanes);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  return (
    <View style={styles.container}>
      {parsed.map((lane, i) => (
        <LaneArrow
          key={i}
          indications={lane.indications}
          valid={lane.valid}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          size={26}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
});
