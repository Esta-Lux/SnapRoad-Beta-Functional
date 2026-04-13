import React, { useState, useCallback, useEffect } from 'react';
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
  /** Distance covered this navigation session (mi), from fused odometry + route progress. */
  drivenMiles?: number | null;
};

export default React.memo(function NavigationStatusStrip({
  drivingMode,
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
  drivenMiles = null,
}: Props) {
  const [calmExpanded, setCalmExpanded] = useState(false);

  useEffect(() => {
    if (drivingMode !== 'calm') setCalmExpanded(false);
  }, [drivingMode]);

  const etaAccent = modeConfig.etaAccentColor;
  const etaBg = isLight ? modeConfig.etaBarBg : modeConfig.etaBarBgDark;
  const textPrimary = modeConfig.etaValueColor;
  const textSec = modeConfig.etaLabelColor;
  const arriveColor = modeConfig.etaArriveColor;

  const arrivalTime = new Date(
    arrivalEpochMs != null && Number.isFinite(arrivalEpochMs)
      ? arrivalEpochMs
      : Date.now() + liveEta.etaMinutes * 60000,
  ).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const distMiles =
    progressDistanceMiles != null && Number.isFinite(progressDistanceMiles)
      ? progressDistanceMiles
      : liveEta.distanceMiles;
  const durMin =
    progressDurationMinutes != null && Number.isFinite(progressDurationMinutes)
      ? progressDurationMinutes
      : liveEta.etaMinutes;
  const distLabel = formatDistance(distMiles);
  const timeLabel = formatDuration(durMin);

  const secondaryLine = useCallback(() => {
    if (isRerouting) {
      return (
        <Text style={[styles.secondary, { color: etaAccent }]} numberOfLines={1}>
          Recalculating…
        </Text>
      );
    }

    if (drivingMode === 'calm') {
      if (calmExpanded) {
        return (
          <Text style={[styles.secondary, { color: textSec }]} numberOfLines={1}>
            <Text style={{ fontWeight: '600', color: textPrimary }}>{Math.round(speedMph)} mph</Text>
            <Text style={{ color: textSec }}> · Smooth drive</Text>
          </Text>
        );
      }
      return (
        <Text style={[styles.secondary, { color: textSec }]} numberOfLines={1}>
          Smooth drive
          <Text style={{ color: textSec, opacity: 0.65 }}> · Tap for speed</Text>
        </Text>
      );
    }

    if (drivingMode === 'sport') {
      return (
        <Text style={[styles.secondary, { color: textSec }]} numberOfLines={1}>
          <Text style={{ fontWeight: '800', color: etaAccent, fontSize: 14 }}>{Math.round(speedMph)} mph</Text>
          <Text style={{ color: textSec }}> · Smooth drive</Text>
        </Text>
      );
    }

    // Adaptive
    if (speedMph > 3) {
      return (
        <Text style={[styles.secondary, { color: textSec }]} numberOfLines={1}>
          <Text style={{ fontWeight: '700', color: textPrimary }}>{Math.round(speedMph)} mph</Text>
          <Text style={{ color: textSec }}> · Smooth drive</Text>
        </Text>
      );
    }
    return (
      <Text style={[styles.secondary, { color: textSec }]} numberOfLines={1}>
        Smooth drive
      </Text>
    );
  }, [
    isRerouting,
    drivingMode,
    calmExpanded,
    speedMph,
    etaAccent,
    textPrimary,
    textSec,
  ]);

  const secondaryWrap =
    drivingMode === 'calm' && !isRerouting ? (
      <Pressable
        onPress={() => setCalmExpanded((v) => !v)}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={calmExpanded ? 'Hide speed' : 'Show speed'}
      >
        {secondaryLine()}
      </Pressable>
    ) : (
      <View>{secondaryLine()}</View>
    );

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
            style={styles.voiceBtn}
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
          <Text style={styles.arriveLine} numberOfLines={1}>
            <Text style={[styles.primaryArrive, { color: arriveColor }]}>Arrive {arrivalTime}</Text>
          </Text>
        </View>
        <View style={styles.secondaryRow}>{secondaryWrap}</View>
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
        <Ionicons name="stop-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
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
    paddingHorizontal: 14,
  },
  contextLine: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  strip: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 9,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  voiceBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 2,
    padding: 6,
    borderRadius: 12,
  },
  primaryLine: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  arriveLine: {
    textAlign: 'center',
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
  },
  primaryLineWithVoice: {
    paddingHorizontal: 40,
  },
  primaryEmphasis: { fontWeight: '900', fontSize: 28, letterSpacing: -0.6 },
  primaryMid: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
  primaryArrive: { fontWeight: '800' },
  drivenLine: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  bullet: { fontWeight: '500' },
  secondaryRow: {
    marginTop: 6,
    alignItems: 'center',
  },
  secondary: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.05,
    textAlign: 'center',
  },
  endBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  endBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
});
