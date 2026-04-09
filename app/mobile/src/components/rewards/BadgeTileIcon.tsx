import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';

type Props = {
  earned: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  accent: string;
  sub: string;
  /** Tile / modal card background — behind corner lock pill */
  surfaceBg: string;
  progress: number;
  /** Outer ring size (px); icon cell is slightly inset */
  ringSize?: number;
  iconCell: number;
  iconRadius: number;
  iconSize: number;
};

export function BadgeTileIcon({
  earned,
  iconName,
  accent,
  sub,
  surfaceBg,
  progress,
  ringSize = 52,
  iconCell,
  iconRadius,
  iconSize,
}: Props) {
  const prog = Math.max(0, Math.min(100, progress));
  const showRing = !earned && prog > 0 && prog < 100;
  const stroke = 2.5;
  const r = (ringSize - stroke) / 2;
  const c = ringSize / 2;
  const circ = 2 * Math.PI * r;
  const dash = (prog / 100) * circ;

  return (
    <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
      {showRing ? (
        <Svg
          width={ringSize}
          height={ringSize}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <G rotation={-90} origin={`${c}, ${c}`}>
            <Circle cx={c} cy={c} r={r} stroke={`${accent}28`} strokeWidth={stroke} fill="none" />
            <Circle
              cx={c}
              cy={c}
              r={r}
              stroke={accent}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
      ) : null}
      <View
        style={{
          width: iconCell,
          height: iconCell,
          borderRadius: iconRadius,
          backgroundColor: earned ? `${accent}28` : `${sub}14`,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={iconName}
          size={iconSize}
          color={accent}
          style={{ opacity: earned ? 1 : 0.42 }}
        />
        {!earned ? (
          <View
            style={[
              styles.lockPill,
              {
                backgroundColor: surfaceBg,
                borderColor: `${sub}40`,
              },
            ]}
          >
            <Ionicons name="lock-closed" size={10} color={sub} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockPill: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    borderRadius: 10,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
