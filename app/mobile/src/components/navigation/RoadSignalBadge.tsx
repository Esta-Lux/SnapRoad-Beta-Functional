/**
 * RoadSignalBadge — small chip showing the road signal at the maneuver point.
 *
 * Renders below the primary instruction line:
 *   “At the traffic light”, “At the stop sign”, etc.
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Rect, Path, Line } from 'react-native-svg';
import type { RoadSignalKind } from '../../navigation/navModel';

interface Props {
  kind: RoadSignalKind;
  label: string;
  textColor: string;
  size?: number;
  /** Muted, monochrome look for nav HUD (matches premium map UIs). */
  variant?: 'default' | 'hud';
  style?: StyleProp<ViewStyle>;
}

function SignalIcon({
  kind,
  size,
  color,
  muted,
}: {
  kind: RoadSignalKind;
  size: number;
  color: string;
  muted: boolean;
}) {
  const c = (hex: string) => (muted ? color : hex);
  switch (kind) {
    case 'traffic_light':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={7} y={1} width={10} height={22} rx={3} fill="none" stroke={color} strokeWidth={1.6} />
          <Circle cx={12} cy={6.5} r={2} fill={c('#FF4444')} opacity={muted ? 0.5 : 1} />
          <Circle cx={12} cy={12} r={2} fill={c('#FFAA00')} opacity={muted ? 0.5 : 1} />
          <Circle cx={12} cy={17.5} r={2} fill={c('#44CC44')} opacity={muted ? 0.45 : 1} />
        </Svg>
      );
    case 'stop_sign':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M8.3 2L2 8.3v7.4L8.3 22h7.4L22 15.7V8.3L15.7 2H8.3z"
            fill={muted ? 'rgba(255,255,255,0.16)' : '#CC3333'}
            stroke={color}
            strokeWidth={muted ? 1.1 : 0.8}
          />
          {!muted && (
            <Path
              d="M7.5 13.5V10.5h1.3c.8 0 1.2.5 1.2 1.1 0 .7-.5 1.1-1.2 1.1H8.3v.8H7.5z"
              fill="#FFF"
            />
          )}
        </Svg>
      );
    case 'yield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2L1 21h22L12 2z" fill="none" stroke={c('#FF6600')} strokeWidth={2} />
          <Path d="M12 6L3.5 20h17L12 6z" fill="none" stroke={color} strokeWidth={0.5} />
        </Svg>
      );
    case 'toll_booth':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={4} width={18} height={16} rx={2} fill="none" stroke={color} strokeWidth={1.8} />
          <Line x1={12} y1={4} x2={12} y2={20} stroke={color} strokeWidth={1.2} />
          <Circle cx={8} cy={12} r={2.5} fill="none" stroke={c('#44CC44')} strokeWidth={1.5} />
          <Line x1={15} y1={9} x2={15} y2={15} stroke={c('#FF4444')} strokeWidth={2} />
        </Svg>
      );
    case 'railway_crossing':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={4} y1={4} x2={20} y2={20} stroke={color} strokeWidth={2.5} />
          <Line x1={20} y1={4} x2={4} y2={20} stroke={color} strokeWidth={2.5} />
          <Circle cx={12} cy={12} r={4} fill="none" stroke={c('#FF4444')} strokeWidth={1.5} />
        </Svg>
      );
    case 'speed_camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={2} y={5} width={20} height={14} rx={2} fill="none" stroke={color} strokeWidth={1.8} />
          <Circle cx={12} cy={12} r={4} fill="none" stroke={color} strokeWidth={1.5} />
          <Circle cx={12} cy={12} r={1.5} fill={color} />
        </Svg>
      );
    case 'roundabout':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} />
          <Path d="M12 7v4l3 2" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}

export default React.memo(function RoadSignalBadge({
  kind,
  label,
  textColor,
  size = 16,
  variant = 'default',
  style,
}: Props) {
  if (kind === 'none' || !label) return null;

  const muted = variant === 'hud';
  return (
    <View style={[styles.badge, muted && styles.badgeHud, style]}>
      <SignalIcon kind={kind} size={muted ? 14 : size} color={textColor} muted={muted} />
      <Text
        style={[styles.label, muted && styles.labelHud, { color: textColor }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 0,
  },
  badgeHud: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelHud: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.15,
    opacity: 0.95,
  },
});
