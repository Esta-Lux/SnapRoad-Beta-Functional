import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const RING = 44;
const PAD = 4;
const FACE = RING - PAD * 2;
const HALO = 56;

type Props = {
  onPress?: () => void;
  /** Top → bottom gradient on the pin face */
  gradientColors: [string, string];
  /** Soft outer halo (use rgba) */
  glowColor: string;
  children: React.ReactNode;
  /** Slightly smaller for dense layers (e.g. offers) */
  compact?: boolean;
};

/**
 * Premium map pin for MarkerView: gradient capsule, halo, white ring, tail.
 * Anchor MarkerView at { x: 0.5, y: 1 } so the tip sits on the coordinate.
 */
export default function MapPinMarker({ onPress, gradientColors, glowColor, children, compact }: Props) {
  const scale = compact ? 0.88 : 1;
  const ring = Math.round(RING * scale);
  const pad = Math.max(2, Math.round(PAD * scale));
  const face = Math.max(24, ring - pad * 2);
  const halo = Math.round(HALO * scale);
  const tailW = Math.round(10 * scale);

  const inner = (
    <View style={styles.stack} pointerEvents="box-none" collapsable={false}>
      <View style={[styles.halo, { width: halo, height: halo, borderRadius: halo / 2, backgroundColor: glowColor }]} />
      <View style={[styles.shadowWrap, shadowMd, { borderRadius: ring / 2 }]}>
        <View
          style={[
            styles.ring,
            {
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              padding: pad,
            },
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.face, { width: face, height: face, borderRadius: face / 2 }]}
          >
            {children}
          </LinearGradient>
        </View>
      </View>
      <View
        style={[
          styles.tail,
          {
            borderLeftWidth: tailW / 2,
            borderRightWidth: tailW / 2,
            borderTopWidth: Math.round(9 * scale),
            borderTopColor: gradientColors[1],
            marginTop: -4 * scale,
          },
        ]}
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={10}
        collapsable={false}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={styles.hit} collapsable={false}>
      {inner}
    </View>
  );
}

const shadowMd = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  android: { elevation: 8 },
  default: {},
});

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 4,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.97 }] },
  stack: { alignItems: 'center' },
  shadowWrap: { backgroundColor: '#fff' },
  halo: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
  },
  ring: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  face: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
  },
});
