import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { NavigationProgress } from '../../navigation/navModel';

type SdkDiag = {
  lastProgressIngestAtMs: number;
  lastVoiceInstructionText: string | null;
  sdkGuidancePhase?: 'idle' | 'waiting' | 'active';
  telemetry?: {
    startedAtMs: number;
    progressEvents: number;
    locationEvents: number;
    voiceEvents: number;
  };
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
    const phase = sdkDiag?.sdkGuidancePhase ?? '—';
    const tel = sdkDiag?.telemetry;
    const telSec =
      tel && tel.startedAtMs > 0 ? Math.max(0.001, (Date.now() - tel.startedAtMs) / 1000) : 0;
    const progPerSec = tel && telSec > 0 ? (tel.progressEvents / telSec).toFixed(1) : '—';
    const locPerSec = tel && telSec > 0 ? (tel.locationEvents / telSec).toFixed(1) : '—';
    const voicePerMin = tel && telSec > 0 ? ((tel.voiceEvents / telSec) * 60).toFixed(1) : '—';
    return (
      <View pointerEvents="none" style={[styles.wrap, { top: topInset + 120 }]}>
        <Text style={styles.lineBold}>
          NAV SDK phase={phase} · UI src={src}
          {typeof ageMs === 'number' ? ` · progress Δ ${Math.round(ageMs / 100) / 10}s` : ''}
        </Text>
        <Text style={styles.line}>
          rates: progress≈{progPerSec}/s · location≈{locPerSec}/s · voice≈{voicePerMin}/min · stepIdx=
          {progress?.nextStep?.index ?? '—'} · cardIdx={currentStepIndex}
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
