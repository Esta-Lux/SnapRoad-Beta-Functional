import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { NavStep } from '../../navigation/navModel';
import LaneGuidance from './LaneGuidance';
import HighwayShieldBadge from './HighwayShieldBadge';

type Props = {
  visible: boolean;
  step: NavStep | null;
  distanceLabel: string;
};

export default function JunctionViewPopup({ visible, step, distanceLabel }: Props) {
  if (!visible || !step) return null;
  const title = step.exitNumber ? `Exit ${step.exitNumber}` : step.displayInstruction;
  const road = step.destinationRoad || step.streetName || '';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.preview}>
        <Svg width="100%" height="100%" viewBox="0 0 320 210">
          <Rect x="0" y="0" width="320" height="210" rx="18" fill="#1F3B32" />
          <Path d="M55 210 C90 155 110 112 132 0" stroke="#5A746B" strokeWidth="30" fill="none" />
          <Path d="M161 210 C170 150 181 92 236 0" stroke="#5A746B" strokeWidth="28" fill="none" opacity="0.9" />
          <Path d="M110 210 C118 155 128 110 154 75 C174 49 205 29 255 0" stroke="#3B82F6" strokeWidth="12" fill="none" />
          <Path d="M154 75 C186 56 213 40 255 0" stroke="#22C55E" strokeWidth="7" fill="none" />
          <Circle cx="110" cy="196" r="10" fill="#FFFFFF" />
          <Path d="M110 188 L116 203 L110 199 L104 203 Z" fill="#3B82F6" />
        </Svg>
        <View style={styles.info}>
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
        </View>
      </View>
      {step.lanes.length ? (
        <View style={styles.lanes}>
          <LaneGuidance lanes={step.lanes.slice(0, 5)} activeColor="#FFFFFF" inactiveColor="#9CA3AF" />
        </View>
      ) : null}
    </View>
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
  preview: { height: 210 },
  info: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  infoTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  exitBadge: { backgroundColor: '#3B82F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  exitBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  distanceBadge: { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  distanceBadgeText: { color: '#111827', fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  road: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700', marginTop: 2 },
  lanes: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.16)' },
});
