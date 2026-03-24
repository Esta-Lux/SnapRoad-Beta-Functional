import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  opacity?: number;
}

export default function DirectionCone({ opacity = 0.3 }: Props) {
  return (
    <Svg width={64} height={96} viewBox="0 0 64 96">
      <Defs>
        <LinearGradient id="coneFade" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0%" stopColor={`rgba(59,130,246,${opacity})`} />
          <Stop offset="100%" stopColor="rgba(59,130,246,0.0)" />
        </LinearGradient>
      </Defs>
      <Path d="M32 90 L10 20 Q32 2 54 20 Z" fill="url(#coneFade)" />
    </Svg>
  );
}
