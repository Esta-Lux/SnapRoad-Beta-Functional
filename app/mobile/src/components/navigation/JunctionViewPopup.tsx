import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { NavStep } from '../../navigation/navModel';
import LaneGuidance from './LaneGuidance';
import HighwayShieldBadge from './HighwayShieldBadge';

type Props = {
  visible: boolean;
  step: NavStep | null;
  distanceLabel: string;
};

export default function JunctionViewPopup({ visible, step, distanceLabel }: Props) {
  const { height } = useWindowDimensions();
  if (!visible || !step) return null;

  const title = step.exitNumber ? `Exit ${step.exitNumber}` : step.displayInstruction;
  const road = step.destinationRoad || step.streetName || '';
  const previewHeight = Math.min(260, Math.max(188, height * 0.24));
  const activeLaneIndex = Math.max(0, step.lanes.findIndex((lane) => lane.preferred || lane.active));
  const activeLanePath =
    activeLaneIndex > 1
      ? 'M160 220 C169 154 183 92 240 -8'
      : 'M110 220 C118 155 128 110 154 75 C174 49 205 29 255 -8';

  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      style={styles.wrap}
      pointerEvents="none"
    >
      <View style={[styles.preview, { height: previewHeight }]}>
        <Svg width="100%" height="100%" viewBox="0 0 320 210">
          <Defs>
            <LinearGradient id="junction-bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#12382F" />
              <Stop offset="1" stopColor="#111827" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="320" height="210" rx="18" fill="url(#junction-bg)" />
          <Path d="M56 220 C86 164 110 116 132 -8" stroke="#648176" strokeWidth="34" fill="none" opacity="0.72" />
          <Path d="M158 220 C168 154 182 92 240 -8" stroke="#6A877A" strokeWidth="32" fill="none" opacity="0.74" />
          <Path d="M239 220 C244 160 256 92 305 -5" stroke="#597469" strokeWidth="30" fill="none" opacity="0.48" />
          <Path d={activeLanePath} stroke="#22C55E" strokeWidth="18" fill="none" opacity="0.72" />
          <Path d="M110 220 C118 155 128 110 154 75 C174 49 205 29 255 -8" stroke="#3B82F6" strokeWidth="12" fill="none" strokeLinecap="round" />
          <Path d="M154 75 C186 56 213 40 255 0" stroke="#22C55E" strokeWidth="7" fill="none" strokeLinecap="round" />
          <Circle cx="110" cy="196" r="10" fill="#FFFFFF" />
          <Path d="M110 188 L116 203 L110 199 L104 203 Z" fill="#3B82F6" />
        </Svg>
        <Animated.View entering={FadeIn.duration(200)} style={styles.info}>
          <View style={styles.infoTop}>
            {step.exitNumber ? (
              <View style={styles.exitBadge}>
                <Text style={styles.exitBadgeText}>Exit {step.exitNumber}</Text>
              </View>
            ) : null}
            {step.shields.length ? <HighwayShieldBadge shields={step.shields} textColor="#fff" /> : null}
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>{distanceLabel}</Text>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {road ? <Text style={styles.road} numberOfLines={1}>Toward {road}</Text> : null}
        </Animated.View>
      </View>
      {step.lanes.length ? (
        <View style={styles.lanes}>
          <LaneGuidance lanes={step.lanes.slice(0, 5)} activeColor="#FFFFFF" inactiveColor="#9CA3AF" />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(17,24,39,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  preview: { minHeight: 188 },
  info: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  infoTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  exitBadge: { backgroundColor: '#3B82F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  exitBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  distanceBadge: { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  distanceBadgeText: { color: '#111827', fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'], textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  road: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700', marginTop: 2 },
  lanes: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.16)' },
});
