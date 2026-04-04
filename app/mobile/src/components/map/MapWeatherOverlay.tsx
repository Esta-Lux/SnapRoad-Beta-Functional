import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { MapPrecipitation } from '../../hooks/useMapWeather';

const STICKS = 22;
const FLAKES = 26;

type ProgressRef = { value: number };

type RainStickProps = {
  progress: ProgressRef;
  phase: number;
  leftPct: number;
  stickOpacity: number;
};

function RainStick({ progress, phase, leftPct, stickOpacity }: RainStickProps) {
  const style = useAnimatedStyle(() => {
    const y = ((progress.value + phase) % 1) * 110;
    return {
      transform: [{ rotate: '-14deg' }, { translateY: y }],
    };
  }, [phase]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: `${leftPct}%`,
          top: -8,
          width: 1.5,
          height: 26,
          borderRadius: 1,
          backgroundColor: `rgba(210, 225, 255, ${stickOpacity})`,
        },
        style,
      ]}
    />
  );
}

type SnowFlakeProps = {
  progress: ProgressRef;
  phase: number;
  leftPct: number;
  topOffset: number;
  size: number;
  drift: number;
  flakeOpacity: number;
};

function SnowFlake({ progress, phase, leftPct, topOffset, size, drift, flakeOpacity }: SnowFlakeProps) {
  const style = useAnimatedStyle(() => {
    const t = (progress.value + phase) % 1;
    const y = t * (Dimensions.get('window').height * 0.55 + 40);
    const x = Math.sin(t * Math.PI * 2 + phase * 6) * drift;
    return {
      transform: [{ translateX: x }, { translateY: topOffset + y }],
      opacity: 0.35 + flakeOpacity * 0.65,
    };
  }, [phase, topOffset, drift, flakeOpacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: `${leftPct}%`,
          top: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `rgba(255, 255, 255, ${0.5 + flakeOpacity * 0.45})`,
        },
        style,
      ]}
    />
  );
}

export type MapWeatherOverlayProps = {
  precipitation: MapPrecipitation;
  intensity: number;
  /** From weatherOverlayFactor(drivingMode, isLight) */
  modeFactor: number;
  isLight: boolean;
  isDay?: boolean;
};

/**
 * Non-interactive precipitation layer above the map, below chrome (z-index 8).
 * Driven by `/api/weather/current` via useMapWeather.
 */
export default function MapWeatherOverlay({
  precipitation,
  intensity,
  modeFactor,
  isLight,
  isDay = true,
}: MapWeatherOverlayProps) {
  const progress = useSharedValue(0);

  const show = precipitation !== 'none' && intensity > 0.04;
  const dayMul = isDay ? 1 : 0.88;

  useEffect(() => {
    if (!show) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    const dur = precipitation === 'rain' ? 560 : 2100;
    progress.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false);
  }, [show, precipitation, progress]);

  const sticks = useMemo(
    () => Array.from({ length: STICKS }, (_, i) => ({ i, left: (i / STICKS) * 100, phase: (i / STICKS) * 0.97 })),
    [],
  );

  const flakes = useMemo(
    () =>
      Array.from({ length: FLAKES }, (_, i) => ({
        i,
        left: ((i * 17) % 100) + (i % 3) * 0.8,
        phase: (i / FLAKES) * 0.94,
        topOffset: (i % 5) * (Dimensions.get('window').height * 0.06),
        size: 2.5 + (i % 4) * 0.65,
        drift: 10 + (i % 5) * 3,
      })),
    [],
  );

  if (!show) return null;

  const veil = Math.min(0.42, intensity * modeFactor * (isLight ? 0.32 : 0.4) * dayMul);
  const stickOp = Math.min(0.55, 0.12 + intensity * modeFactor * 0.5 * dayMul);
  const flakeBase = Math.min(0.5, 0.1 + intensity * modeFactor * 0.45 * dayMul);

  if (precipitation === 'rain') {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap]}>
        <LinearGradient
          pointerEvents="none"
          colors={[
            `rgba(28, 48, 78, ${veil * 0.95})`,
            `rgba(40, 58, 86, ${veil * 0.45})`,
            'transparent',
          ]}
          locations={[0, 0.38, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
          {sticks.map(({ i, left, phase }) => (
            <RainStick key={i} progress={progress} phase={phase} leftPct={left} stickOpacity={stickOp} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap]}>
      <LinearGradient
        pointerEvents="none"
        colors={[
          `rgba(230, 240, 255, ${veil * 0.85})`,
          `rgba(200, 215, 240, ${veil * 0.35})`,
          'transparent',
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        {flakes.map((f) => (
          <SnowFlake
            key={f.i}
            progress={progress}
            phase={f.phase}
            leftPct={f.left}
            topOffset={f.topOffset}
            size={f.size}
            drift={f.drift}
            flakeOpacity={flakeBase}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 8,
  },
});
