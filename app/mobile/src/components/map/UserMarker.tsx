import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

interface Props {
  heading: number;
  isNavigating: boolean;
  speed: number;
}

export default function UserMarker({ heading, isNavigating, speed }: Props) {
  const animatedHeading = useSharedValue(heading);

  useEffect(() => {
    animatedHeading.value = withTiming(heading, { duration: 200 });
  }, [heading]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${animatedHeading.value}deg` }],
  }));

  const showCone = speed > 1 || isNavigating;
  const coneOpacity = isNavigating ? 0.3 : speed > 2 ? 0.15 : 0;

  return (
    <View style={styles.container}>
      {showCone && (
        <Animated.View style={[styles.coneContainer, arrowStyle]}>
          <Svg width={64} height={96} viewBox="0 0 64 96">
            <Defs>
              <LinearGradient id="coneFade" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor="rgba(59,130,246,0.28)" />
                <Stop offset="100%" stopColor="rgba(59,130,246,0.0)" />
              </LinearGradient>
            </Defs>
            <Path d="M32 90 L10 20 Q32 2 54 20 Z" fill="url(#coneFade)" opacity={coneOpacity / 0.3} />
          </Svg>
        </Animated.View>
      )}
      <Animated.View style={[styles.arrowContainer, arrowStyle]}>
        <Svg width={32} height={32} viewBox="0 0 64 64">
          <Path
            d="M32 7 L49 45 L32 38 L15 45 Z"
            fill="#3B82F6"
            stroke="#ffffff"
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <Path d="M32 17 L40 35 L32 31 L24 35 Z" fill="#93C5FD" opacity={0.95} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    height: 96,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  coneContainer: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
