import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { NavigationProgress } from '../../navigation/navModel';

type SdkDiag = {
  lastProgressIngestAtMs: number;
  lastVoiceInstructionText: string | null;
} | null;

type Props = {
  progress: NavigationProgress | null;
  currentStepIndex: number;
  topInset: number;
  logicSdk?: boolean;
  sdkDiag?: SdkDiag;
};

/** Dev-only nav truth HUD — keep off production builds via caller gating. */
export default React.memo(function NavigationDebugHud({
  progress,
  currentStepIndex,
  topInset,
  logicSdk = false,
  sdkDiag = null,
}: Props) {
  const ageMs = useMemo(() => {
    if (!sdkDiag?.lastProgressIngestAtMs) return null;
    return Date.now() - sdkDiag.lastProgressIngestAtMs;
  }, [sdkDiag?.lastProgressIngestAtMs]);

  if (logicSdk) {
    const src = progress?.instructionSource ?? (progress ? '—' : 'none');
    const active = progress?.instructionSource === 'sdk';
    return (
      <View pointerEvents="none" style={[styles.wrap, { top: topInset + 120 }]}>
        <Text style={styles.lineBold}>
          NAV SDK: {active ? 'ACTIVE' : 'WAITING'}
          {typeof ageMs === 'number' ? ` · progress Δ ${Math.round(ageMs / 100) / 10}s` : ''}
        </Text>
        <Text style={styles.line}>
          instruction={src} · stepIdx={progress?.nextStep?.index ?? '—'} · cardIdx={currentStepIndex}
        </Text>
        {sdkDiag?.lastVoiceInstructionText ? (
          <Text style={styles.line} numberOfLines={2}>
            voice: {sdkDiag.lastVoiceInstructionText}
          </Text>
        ) : null}
        {progress ? (
          <>
            <Text style={styles.line}>
              nextD={progress.nextStepDistanceMeters.toFixed(0)}m · offRoute=
              {progress.isOffRoute ? '1' : '0'} · snap=
              {progress.snapped?.distanceMeters != null ? progress.snapped.distanceMeters.toFixed(0) : '—'}m
            </Text>
            {progress.etaNaiveSeconds != null && progress.etaBlendWeight != null ? (
              <Text style={styles.line}>
                ETA model={Math.round(progress.modelDurationRemainingSeconds)}s disp=
                {Math.round(progress.durationRemainingSeconds)}s
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.line}>No NavigationProgress yet — native session may still be starting.</Text>
        )}
      </View>
    );
  }

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
  lineBold: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
