import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LaneInfo } from '../../navigation/navModel';
import type { NativeLaneAsset } from '../../navigation/navSdkMirrorTypes';
import LaneGuidance from './LaneGuidance';

type Props = {
  lanes: LaneInfo[];
  nativeLaneAssets?: NativeLaneAsset[] | null;
};

export default function LaneGuidanceBar({ lanes, nativeLaneAssets }: Props) {
  if (!lanes.length) return null;
  return (
    <View style={styles.bar}>
      <LaneGuidance
        lanes={lanes.slice(0, 5)}
        nativeLaneAssets={nativeLaneAssets}
        activeColor="#FFFFFF"
        inactiveColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 60,
    justifyContent: 'center',
    backgroundColor: 'rgba(26,26,26,0.9)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
