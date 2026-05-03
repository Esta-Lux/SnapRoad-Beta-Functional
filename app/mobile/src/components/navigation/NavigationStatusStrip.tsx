import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { DrivingMode } from '../../types';
import type { ModeConfig } from '../../constants/modes';
import { formatDistance } from '../../utils/distance';
import { formatDuration } from '../../utils/format';
import { NAV_MAP_BOTTOM_CHROME_PX } from '../../navigation/cameraPresets';
import {
  resolveStableArrival,
  resolveStableSpeedMph,
  resolveStableStripProgress,
  type ArrivalDisplay,
  type StripProgressSnap,
} from '../../navigation/navDisplayHysteresis';

/**
 * Vertical offset above the safe area for nav FABs / street pill so they clear the status strip
 * (ETA rows + voice + End navigation — taller than a single bar). Matches follow-camera bottom reserve.
 */
export const MAP_NAV_BOTTOM_INSET = NAV_MAP_BOTTOM_CHROME_PX;

type LiveEta = { distanceMiles: number; etaMinutes: number };

type Props = {
  drivingMode: DrivingMode;
  modeConfig: ModeConfig;
  isLight: boolean;
  liveEta: LiveEta;
  /** Wall-clock arrival from {@link NavigationProgress.etaEpochMs} — single ETA truth (not recomputed from rounded minutes). */
  arrivalEpochMs?: number | null;
  /** When set, strip distance matches {@link NavigationProgress.distanceRemainingMeters} (converted to miles). */
  progressDistanceMiles?: number | null;
  /** When set, strip duration matches {@link NavigationProgress.durationRemainingSeconds} (as minutes). */
  progressDurationMinutes?: number | null;
  speedMph: number;
  isRerouting: boolean;
  onEndNavigation: () => void;
  bottomInset: number;
  /** Optional line above ETA (e.g. friend live-follow). */
  contextLine?: string | null;
  /** Turn-by-turn speech mute (persisted on MapScreen). */
  voiceMuted?: boolean;
  onVoiceToggle?: () => void;
  /** Long-press voice control: repeat last turn-by-turn cue (not mute). */
  onVoiceRepeat?: () => void;
};

function finiteOrFallback(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export default React.memo(function NavigationStatusStrip({
  drivingMode: _drivingMode,
  modeConfig,
  isLight,
  liveEta,
  arrivalEpochMs,
  progressDistanceMiles,
  progressDurationMinutes,
  speedMph,
  isRerouting,
  onEndNavigation,
  bottomInset,
  contextLine,
  voiceMuted = false,
  onVoiceToggle,
  onVoiceRepeat,
}: Props) {
  const etaAccent = modeConfig.etaAccentColor;
  const etaBg = isLight ? modeConfig.etaBarBg : modeConfig.etaBarBgDark;
  const textPrimary = modeConfig.etaValueColor;
  const textSec = modeConfig.etaLabelColor;
  const arriveColor = modeConfig.etaArriveColor;

  /**
   * Arrival clock hysteresis — kills the "minute flipping back and forth" flicker.
   * See {@link resolveStableArrival} for rules.
   */
  const arrivalDisplayRef = useRef<ArrivalDisplay | null>(null);
  const arrivalTime = useMemo(() => {
    const etaMinutes = finiteOrFallback(liveEta.etaMinutes, 0);
    const fallback = Date.now() + etaMinutes * 60000;
    const rawEpoch =
      arrivalEpochMs != null && Number.isFinite(arrivalEpochMs)
        ? arrivalEpochMs
        : fallback;
    const next = resolveStableArrival(arrivalDisplayRef.current, rawEpoch, Date.now());
    arrivalDisplayRef.current = next;
    return new Date(next.epoch).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [arrivalEpochMs, liveEta.etaMinutes]);

  const liveDistanceMiles = finiteOrFallback(liveEta.distanceMiles, 0);
  const liveEtaMinutes = finiteOrFallback(liveEta.etaMinutes, 0);
  const rawDistMiles =
    progressDistanceMiles != null && Number.isFinite(progressDistanceMiles)
      ? progressDistanceMiles
      : liveDistanceMiles;
  const rawDurMin =
    progressDurationMinutes != null && Number.isFinite(progressDurationMinutes)
      ? progressDurationMinutes
      : liveEtaMinutes;

  const stripSnapRef = useRef<StripProgressSnap | null>(null);
  const { distMiles, durMin } = useMemo(() => {
    const now = Date.now();
    const next = resolveStableStripProgress(
      stripSnapRef.current,
      rawDistMiles,
      rawDurMin,
      now,
    );
    stripSnapRef.current = next;
    return { distMiles: next.milesPacked, durMin: next.minsPacked };
  }, [rawDistMiles, rawDurMin]);

  const distLabel = formatDistance(distMiles);
  const timeLabel = formatDuration(durMin);

  /**
   * Speed-mph display hysteresis. See {@link resolveStableSpeedMph}.
   */
  const displayedSpeedMphRef = useRef<number>(Math.round(Math.max(0, speedMph)));
  const displayedSpeedMph = useMemo(() => {
    const next = resolveStableSpeedMph(displayedSpeedMphRef.current, speedMph);
    displayedSpeedMphRef.current = next;
    return next;
  }, [speedMph]);

  const mphLabel = `${displayedSpeedMph} mph`;
  const compactSpeedPx = Math.min(13, Math.max(11, Math.round(modeConfig.speedFontSize * 0.5)));

  /** One compact speed line shared by Calm / Adaptive / Sport; color + scale from mode config. */
  const secondaryNode = useMemo(() => {
    if (isRerouting) {
      return (
        <Text style={[styles.reroutingNote, { color: etaAccent }]} numberOfLines={1}>
          Recalculating…
        </Text>
      );
    }
    return (
      <Text
        style={[styles.speedFoot, { color: modeConfig.speedColor, fontSize: compactSpeedPx }]}
        numberOfLines={1}
        accessibilityLabel={`Current speed ${mphLabel}`}
      >
        {mphLabel}
      </Text>
    );
  }, [
    compactSpeedPx,
    etaAccent,
    isRerouting,
    modeConfig.speedColor,
    mphLabel,
  ]);

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      style={[styles.outer, { paddingBottom: Math.max(bottomInset, 10) + 4 }]}
    >
      <View
        style={[
          styles.strip,
          {
            backgroundColor: etaBg,
            borderTopColor: etaAccent + '33',
          },
        ]}
      >
        {onVoiceToggle ? (
          <Pressable
            style={[styles.voiceBtn, styles.voiceBtnOffset]}
            onPress={onVoiceToggle}
            onLongPress={onVoiceRepeat}
            delayLongPress={450}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={voiceMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
            accessibilityHint={onVoiceRepeat ? 'Long press to repeat last instruction' : undefined}
          >
            <Ionicons
              name={voiceMuted ? 'volume-mute' : 'volume-high'}
              size={20}
              color={voiceMuted ? textSec : etaAccent}
            />
          </Pressable>
        ) : null}
        <View style={onVoiceToggle ? styles.primaryLineWithVoice : undefined}>
          <Text style={styles.primaryLine} numberOfLines={1}>
            <Text style={[styles.primaryEmphasis, { color: etaAccent }]}>{timeLabel}</Text>
            <Text style={[styles.bullet, { color: textSec }]}> · </Text>
            <Text style={[styles.primaryMid, { color: textPrimary }]}>{distLabel}</Text>
          </Text>
          <Text style={[styles.arriveLine, { color: arriveColor }]} numberOfLines={1}>
            Arrive {arrivalTime}
          </Text>
        </View>
        <View style={styles.secondaryRow}>{secondaryNode}</View>
      </View>

      <TouchableOpacity
        style={[
          styles.endBtn,
          {
            backgroundColor: modeConfig.endButtonColor,
            borderRadius: modeConfig.endButtonRadius,
            ...(modeConfig.endButtonGlow
              ? {
                  shadowColor: modeConfig.endButtonGlowColor,
                  shadowOpacity: 0.28,
                  shadowRadius: 8,
                }
              : {}),
            ...(modeConfig.endButtonBorder
              ? {
                  borderWidth: 1,
                  borderColor: modeConfig.endButtonBorder,
                }
              : {}),
          },
        ]}
        onPress={onEndNavigation}
        activeOpacity={0.88}
        accessibilityLabel="End navigation"
      >
        <Ionicons name="stop-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.endBtnText}>End navigation</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  contextLine: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  /** Detached from map at bottom: top edge and upward shadow (negative Y) “face” the map; content reads toward the driver. */
  strip: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  voiceBtn: {
    position: 'absolute',
    right: 6,
    zIndex: 2,
    padding: 6,
    borderRadius: 12,
  },
  voiceBtnOffset: {
    top: 5,
  },
  primaryLine: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  arriveLine: {
    textAlign: 'center',
    marginTop: 3,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryLineWithVoice: {
    paddingHorizontal: 40,
  },
  primaryEmphasis: { fontWeight: '900', fontSize: 24, letterSpacing: -0.5 },
  primaryMid: { fontWeight: '800', fontSize: 20, letterSpacing: -0.45 },
  bullet: { fontWeight: '500' },
  secondaryRow: {
    marginTop: 4,
    alignItems: 'center',
  },
  speedFoot: {
    fontWeight: '800',
    letterSpacing: -0.04,
    textAlign: 'center',
  },
  reroutingNote: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.04,
    textAlign: 'center',
  },
  endBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  endBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.15 },
});
