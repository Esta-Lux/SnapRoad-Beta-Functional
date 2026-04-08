import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { NavigationProgress } from '../../navigation/navModel';

type Props = {
  progress: NavigationProgress | null;
  currentStepIndex: number;
  topInset: number;
};

/** Dev-only nav truth HUD — keep off production builds via caller gating. */
export default React.memo(function NavigationDebugHud({
  progress,
  currentStepIndex,
  topInset,
}: Props) {
  if (!progress) return null;
  const snapM = progress.snapped?.distanceMeters;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: topInset + 120 }]}>
      <Text style={styles.line}>
        nextD={progress.nextStepDistanceMeters.toFixed(0)}m · stepIdx={progress.nextStep?.index ?? '—'} ·
        cardIdx={currentStepIndex}
      </Text>
      <Text style={styles.line}>
        offRoute={progress.isOffRoute ? '1' : '0'} · conf={progress.confidence.toFixed(2)} · snap=
        {snapM != null ? snapM.toFixed(0) : '—'}m
      </Text>
      {progress.etaNaiveSeconds != null && progress.etaBlendWeight != null ? (
        <Text style={styles.line}>
          ETA model={Math.round(progress.modelDurationRemainingSeconds)}s disp=
          {Math.round(progress.durationRemainingSeconds)}s naive=
          {Math.round(progress.etaNaiveSeconds)}s w=
          {progress.etaBlendWeight.toFixed(2)}
        </Text>
      ) : null}
    </View>
  );
});

const BG = 'rgba(0,0,0,0.72)';
const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 200,
    padding: 8,
    borderRadius: 8,
    backgroundColor: BG,
  },
  line: {
    color: '#a7f3d0',
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
