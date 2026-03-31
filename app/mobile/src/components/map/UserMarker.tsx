import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

interface Props {
  heading: number;
  isNavigating: boolean;
  speed: number;
}

export default React.memo(function UserMarker({ heading, isNavigating, speed }: Props) {
  const rot = useSharedValue(heading);

  useEffect(() => {
    rot.value = withTiming(heading, { duration: 200 });
  }, [heading]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const showCone = true;
  const coneOpacity = isNavigating ? 0.6 : speed > 5 ? 0.3 : speed >= 1 ? 0.2 : 0.12;

  return (
    <View style={S.root}>
      {showCone && (
        <Animated.View style={[S.cone, rotateStyle]}>
          <Svg width={72} height={100} viewBox="0 0 72 100">
            <Defs>
              <LinearGradient id="cf" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor="rgba(59,130,246,0.32)" />
                <Stop offset="100%" stopColor="rgba(59,130,246,0)" />
              </LinearGradient>
            </Defs>
            <Path
              d="M36 94 L8 22 Q36 2 64 22 Z"
              fill="url(#cf)"
              opacity={coneOpacity / 0.6}
            />
          </Svg>
        </Animated.View>
      )}
      <Animated.View style={[S.arrow, rotateStyle]}>
        <Svg width={36} height={36} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={26} fill="#3B82F6" opacity={0.12} />
          <Circle cx={32} cy={32} r={18} fill="#3B82F6" opacity={0.08} />
          <Path
            d="M32 6 L51 46 L32 37 L13 46 Z"
            fill="#3B82F6"
            stroke="#ffffff"
            strokeWidth={4.5}
            strokeLinejoin="round"
          />
          <Path d="M32 16 L42 36 L32 31 L22 36 Z" fill="#93C5FD" opacity={0.9} />
        </Svg>
      </Animated.View>
    </View>
  );
});

const S = StyleSheet.create({
  root: { width: 72, height: 100, alignItems: 'center', justifyContent: 'flex-end' },
  cone: { position: 'absolute', top: 0, alignItems: 'center' },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
