import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { NavigationProgress } from '../../navigation/navModel';
import {
  navLogicSdkEnabled,
  navNativeFullScreenEnabled,
  navNativeSdkEnabled,
} from '../../navigation/navFeatureFlags';

type SdkDiag = {
  lastProgressIngestAtMs: number;
  lastVoiceInstructionText: string | null;
  lastNavVoiceSource?: 'sdk' | 'js' | 'none';
  sdkGuidancePhase?: 'idle' | 'waiting' | 'active';
  telemetry?: {
    startedAtMs: number;
    progressEvents: number;
    locationEvents: number;
    voiceEvents: number;
    routeChangedEvents: number;
  };
} | null;

type Props = {
  progress: NavigationProgress | null;
  currentStepIndex: number;
  topInset: number;
  logicSdk?: boolean;
  sdkDiag?: SdkDiag;
  /** When true, show extended EAS-safe diagnostics (requires EXPO_PUBLIC_NAV_LOGIC_DEBUG=1). */
  extendedDiag?: boolean;
};

/** Dev / optional release HUD — gated by caller (`__DEV__` or {@link navLogicDebugEnabled}). */
export default React.memo(function NavigationDebugHud({
  progress,
  currentStepIndex,
  topInset,
  logicSdk = false,
  sdkDiag = null,
  extendedDiag = false,
}: Props) {
  const ageMs = useMemo(() => {
    if (!sdkDiag?.lastProgressIngestAtMs) return null;
    return Date.now() - sdkDiag.lastProgressIngestAtMs;
  }, [sdkDiag?.lastProgressIngestAtMs]);

  const envLine = useMemo(() => {
    const logic = navLogicSdkEnabled();
    const native = navNativeSdkEnabled();
    const fullNative = navNativeFullScreenEnabled();
    const mode = logic
      ? 'HEADLESS_LOGIC'
      : fullNative
        ? 'FULL_NATIVE_UI'
        : 'JS_GUIDANCE';
    const precedence =
      logic && native
        ? 'LOGIC wins: no full-screen native from MapScreen'
        : native && !logic
          ? 'NATIVE+!LOGIC: full-screen available'
          : 'JS map nav';
    return { logic, native, fullNative, mode, precedence };
  }, []);

  if (logicSdk) {
    const instr = progress?.instructionSource;
    const uiInstr =
      instr === 'sdk' ? 'SDK' : instr === 'sdk_waiting' ? 'SDK(wait)' : instr === 'js' ? 'JS' : 'NONE';
    const phase = sdkDiag?.sdkGuidancePhase ?? '—';
    const tripState =
      phase === 'idle' ? 'IDLE' : phase === 'waiting' ? 'STARTING' : 'ACTIVE';
    const tel = sdkDiag?.telemetry;
    const telSec =
      tel && tel.startedAtMs > 0 ? Math.max(0.001, (Date.now() - tel.startedAtMs) / 1000) : 0;
    const progPerSec = tel && telSec > 0 ? (tel.progressEvents / telSec).toFixed(1) : '—';
    const locPerSec = tel && telSec > 0 ? (tel.locationEvents / telSec).toFixed(1) : '—';
    const voicePerMin = tel && telSec > 0 ? ((tel.voiceEvents / telSec) * 60).toFixed(1) : '—';
    const routeChg = tel?.routeChangedEvents ?? 0;
    const lastVoicePipe = sdkDiag?.lastNavVoiceSource ?? 'none';
    return (
      <View pointerEvents="none" style={[styles.wrap, { top: topInset + 120 }]}>
        {extendedDiag ? (
          <Text style={styles.lineBold}>
            FLAGS LOGIC={envLine.logic ? '1' : '0'} NATIVE={envLine.native ? '1' : '0'} · mode={envLine.mode}
          </Text>
        ) : null}
        {extendedDiag ? (
          <Text style={styles.line}>{envLine.precedence}</Text>
        ) : null}
        <Text style={styles.lineBold}>
          NAV SDK phase={phase} · trip={tripState} · UI src={uiInstr}
          {typeof ageMs === 'number' ? ` · progress Δ ${Math.round(ageMs / 100) / 10}s` : ''}
        </Text>
        <Text style={styles.line}>
          evt: routeΔ={routeChg} · prog={tel?.progressEvents ?? 0} · loc={tel?.locationEvents ?? 0} · voice=
          {tel?.voiceEvents ?? 0}
        </Text>
        <Text style={styles.line}>
          rates: progress≈{progPerSec}/s · location≈{locPerSec}/s · voice≈{voicePerMin}/min · lastVoice=
          {lastVoicePipe} · stepIdx={progress?.nextStep?.index ?? '—'} · cardIdx={currentStepIndex}
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
