import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

export interface LaneInfo {
  valid: boolean;
  indications: string[];
}

interface LaneArrowProps {
  indications: string[];
  valid: boolean;
  activeColor?: string;
  inactiveColor?: string;
  size?: number;
}

const STROKE_W = 2.5;
const STROKE_W_SECONDARY = 1.8;

/** Render the SVG path(s) for a given maneuver indication. */
function ArrowPath({
  indication,
  color,
  strokeWidth = STROKE_W,
}: {
  indication: string;
  color: string;
  strokeWidth?: number;
}) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (indication) {
    case 'straight':
      return (
        <G>
          <Path d="M12 21 L12 4" {...p} />
          <Path d="M6 10 L12 4 L18 10" {...p} />
        </G>
      );
    case 'left':
    case 'sharp left':
      return (
        <G>
          <Path d="M14 21 L14 10 L5 10" {...p} />
          <Path d="M9 6 L5 10 L9 14" {...p} />
        </G>
      );
    case 'right':
    case 'sharp right':
      return (
        <G>
          <Path d="M10 21 L10 10 L19 10" {...p} />
          <Path d="M15 6 L19 10 L15 14" {...p} />
        </G>
      );
    case 'slight left':
      return (
        <G>
          <Path d="M13 21 L13 11 L7 5" {...p} />
          <Path d="M7 11 L7 5 L13 5" {...p} />
        </G>
      );
    case 'slight right':
      return (
        <G>
          <Path d="M11 21 L11 11 L17 5" {...p} />
          <Path d="M17 11 L17 5 L11 5" {...p} />
        </G>
      );
    case 'uturn':
    case 'u-turn':
      return (
        <G>
          <Path d="M9 21 L9 9 C9 4.5 17 4.5 17 9 L17 14" {...p} />
          <Path d="M13 10 L17 14 L21 10" {...p} />
        </G>
      );
    default:
      // fallback: straight
      return (
        <G>
          <Path d="M12 21 L12 4" {...p} />
          <Path d="M6 10 L12 4 L18 10" {...p} />
        </G>
      );
  }
}

export default function LaneArrow({
  indications,
  valid,
  activeColor = '#ffffff',
  inactiveColor = 'rgba(255,255,255,0.25)',
  size = 26,
}: LaneArrowProps) {
  const primary = indications[0] ?? 'straight';
  const secondary = indications.length > 1 ? indications[1] : null;
  const color = valid ? activeColor : inactiveColor;

  return (
    <View style={{ width: size, height: size, opacity: valid ? 1 : 0.4 }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* Primary arrow */}
        <ArrowPath indication={primary} color={color} strokeWidth={STROKE_W} />
        {/* Secondary arrow overlay (lighter) when lane allows multiple turns */}
        {secondary && secondary !== primary && (
          <ArrowPath
            indication={secondary}
            color={color}
            strokeWidth={STROKE_W_SECONDARY}
          />
        )}
      </Svg>
    </View>
  );
}
