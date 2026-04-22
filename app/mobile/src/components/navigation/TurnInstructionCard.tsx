import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  FadeIn,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { DrivingMode } from '../../types';
import type { ModeConfig } from '../../constants/modes';
import type { TurnCardState } from '../../navigation/turnCardModel';
import type { DirectionsStep } from '../../lib/directions';
import type { ManeuverKind, RoadSignal, LaneInfo, RoadShield } from '../../navigation/navModel';
import type { NativeFormattedDistance, NativeLaneAsset } from '../../navigation/navSdkMirrorTypes';
import { resolveDisplayDistance } from '../../navigation/navDisplayDistance';
import { getBannerThenLine, getLaneData, lanesFromLegacyJson } from '../../navigation/bannerInstructions';
import { navLaneGuidanceUiEnabled } from '../../navigation/navFeatureFlags';
import {
  resolveStableText,
  type StableTextState,
} from '../../navigation/navDisplayHysteresis';
import ManeuverIcon from './ManeuverIcon';
import RoadSignalBadge from './RoadSignalBadge';
import LaneGuidance from './LaneGuidance';
import HighwayShieldBadge from './HighwayShieldBadge';

/** Hold previous lane data for this duration (ms) to prevent flicker during source transitions. */
const LANE_DEBOUNCE_MS = 300;

/**
 * React wrapper over `resolveStableText` — prevents single-frame flips when
 * upstream sources disagree. Legitimate step advances (detected by `resetKey`
 * change) flush instantly. See `navDisplayHysteresis.ts` for the rules.
 */
function useStableText(
  next: string | undefined,
  resetKey: string | number,
): string {
  const holdRef = useRef<StableTextState>({
    displayed: '',
    pending: null,
    pendingSince: 0,
    resetKey,
  });

  return useMemo(() => {
    const nextState = resolveStableText(holdRef.current, next, resetKey, Date.now());
    holdRef.current = nextState;
    return nextState.displayed;
  }, [next, resetKey]);
}

const DENSITY: Record<
  DrivingMode,
  {
    gradPadH: number;
    gradPadV: number;
    gradPadB: number;
    thenOpacity: number;
    borderW: number;
    enterMs: number;
    distScale: number;
  }
> = {
  calm: {
    gradPadH: 16,
    gradPadV: 14,
    gradPadB: 12,
    thenOpacity: 0.72,
    borderW: StyleSheet.hairlineWidth * 2,
    enterMs: 480,
    distScale: 0.94,
  },
  adaptive: {
    gradPadH: 15,
    gradPadV: 12,
    gradPadB: 10,
    thenOpacity: 0.72,
    borderW: StyleSheet.hairlineWidth * 2,
    enterMs: 380,
    distScale: 1,
  },
  sport: {
    gradPadH: 14,
    gradPadV: 10,
    gradPadB: 9,
    thenOpacity: 0.68,
    borderW: 1,
    enterMs: 260,
    distScale: 1.05,
  },
};

export type TurnInstructionCardProps = {
  mode: DrivingMode;
  modeConfig: ModeConfig;
  state: TurnCardState;
  distanceValue: string;
  distanceUnit: string;
  primaryInstruction: string;
  secondaryInstruction?: string;
  maneuverForIcon: string;
  isMuted: boolean;
  onMutePress: () => void;
  /** Fallback lanes JSON when banner has no lane components */
  lanesJson?: string;
  step?: DirectionsStep | null;
  roadDisambiguationLabel?: string | null;
  isSportBorder: boolean;
  speedMph?: number;

  maneuverKind?: ManeuverKind;
  /** Raw Mapbox maneuver `type` (preferred for turn glyph when set). */
  maneuverType?: string;
  /** Raw Mapbox maneuver `modifier` (paired with maneuverType). */
  maneuverModifier?: string;
  signal?: RoadSignal;
  lanes?: LaneInfo[];
  shields?: RoadShield[];
  roundaboutExitNumber?: number | null;
  chainInstruction?: string | null;
  /** Native mirror: locale-formatted distance from SDK (overrides {@link distanceValue} / {@link distanceUnit}). */
  nativeFormattedDistance?: NativeFormattedDistance | null;
  isNativeMirror?: boolean;
  /** Native mirror: per-lane PNGs when aligned with `lanes.length`. */
  nativeLaneAssets?: NativeLaneAsset[] | null;
  /**
   * When set, drives `useStableText` reset key (e.g. SDK banner + step index) so
   * primary copy advances with native voice instead of a 120 ms hold on a stale key.
   */
  textStabilityKey?: string | null;
};

export default React.memo(function TurnInstructionCard({
  mode,
  modeConfig,
  state,
  distanceValue,
  distanceUnit,
  primaryInstruction,
  secondaryInstruction,
  maneuverForIcon: _maneuverForIcon,
  isMuted,
  onMutePress,
  lanesJson,
  step,
  roadDisambiguationLabel,
  isSportBorder,
  speedMph = 0,
  maneuverKind,
  maneuverType,
  maneuverModifier,
  signal,
  lanes,
  shields,
  roundaboutExitNumber,
  chainInstruction,
  nativeFormattedDistance,
  isNativeMirror,
  nativeLaneAssets,
  textStabilityKey,
}: TurnInstructionCardProps) {
  const tcGrad = modeConfig.turnCardGradient;
  const tcRadius = modeConfig.turnCardRadius;
  const tcShadowColor = modeConfig.turnCardShadowColor;
  const tcTextColor = modeConfig.turnCardTextColor;
  const d = DENSITY[mode];

  const displayDistance = useMemo(
    () => resolveDisplayDistance(isNativeMirror, nativeFormattedDistance, distanceValue, distanceUnit),
    [isNativeMirror, nativeFormattedDistance, distanceValue, distanceUnit],
  );

  /**
   * Primary text source precedence (flicker-proof):
   *   1. Parent-supplied `primaryInstruction` (SDK banner under authority, or
   *      the JS REST-builder output). This is the authoritative string —
   *      MapScreen has already applied the single-authority rule.
   *   2. Fallback to `step.bannerInstructions[0].primary.text` ONLY when the
   *      parent hasn't supplied anything yet (first `sdk_waiting` render).
   *
   * Stability hold: `useStableText` prevents any single-frame flip between
   * sources from blinking the card. The hold resets whenever the maneuver step
   * actually changes (tracked via `step.instruction` / `maneuverForIcon`) so
   * legitimate turn transitions feel instant.
   */
  const primaryRaw = useMemo(() => {
    const fromParent = primaryInstruction?.trim();
    if (fromParent) return fromParent;
    return step?.bannerInstructions?.[0]?.primary?.text?.trim() || '';
  }, [step, primaryInstruction]);
  const stableTextKey =
    textStabilityKey?.trim() ||
    `${step?.instruction ?? ''}|${_maneuverForIcon}|${state}`;
  const primaryDisplay = useStableText(primaryRaw, stableTextKey);

  const hasRawManeuver = !!(maneuverType?.trim() || maneuverModifier?.trim());
  const hasKindManeuver = maneuverKind != null && maneuverKind !== 'unknown';
  const hasRichManeuver = hasRawManeuver || hasKindManeuver;

  const rawLanes = useMemo((): LaneInfo[] | null => {
    if (lanes?.length) return lanes;
    const json = getLaneData(step) ?? lanesJson;
    return lanesFromLegacyJson(json);
  }, [lanes, step, lanesJson]);

  /**
   * Debounced lanes — two distinct stability rules:
   *
   *  1. **Step-change blackout** (primary symptom fix): when the step index
   *     advances (tracked via `step.instruction` changing) we render **no
   *     lane guidance** for the 300 ms debounce window. Holding the previous
   *     step's lane display during that window — even for a single frame —
   *     was confusing drivers ("the lanes don't match the turn I'm about to
   *     make"). Showing nothing for 300 ms is strictly better than the
   *     wrong lanes.
   *
   *  2. **Within-step flicker damp**: once the window elapses, if the lane
   *     JSON keeps flipping between sources (banner vs REST lanes) inside
   *     the same step, hold the previous value for 300 ms so the glyphs
   *     don't twitch.
   */
  const debouncedLanesRef = useRef<{
    data: LaneInfo[] | null;
    changedAt: number;
    prevStepInstruction: string | undefined;
    stepChangedAt: number;
  }>({ data: null, changedAt: 0, prevStepInstruction: undefined, stepChangedAt: 0 });

  const effectiveLanes = useMemo((): LaneInfo[] | null => {
    const now = Date.now();
    const prev = debouncedLanesRef.current;
    const stepChanged = step?.instruction !== prev.prevStepInstruction;

    if (stepChanged) {
      debouncedLanesRef.current = {
        data: null,
        changedAt: now,
        prevStepInstruction: step?.instruction,
        stepChangedAt: now,
      };
      return null;
    }

    const inBlackout = now - prev.stepChangedAt < LANE_DEBOUNCE_MS;
    if (inBlackout) return null;

    const lanesChanged = JSON.stringify(rawLanes) !== JSON.stringify(prev.data);
    if (!lanesChanged) return prev.data;

    if (now - prev.changedAt < LANE_DEBOUNCE_MS) {
      return prev.data;
    }
    debouncedLanesRef.current = {
      data: rawLanes,
      changedAt: now,
      prevStepInstruction: step?.instruction,
      stepChangedAt: prev.stepChangedAt,
    };
    return rawLanes;
  }, [rawLanes, step]);

  /**
   * "Then …" secondary line precedence:
   *   1. Parent-supplied `secondaryInstruction` — under SDK authority this is
   *      `banner.secondaryInstruction`, i.e. the native banner's secondary row
   *      (authoritative copy that matches the native voice).
   *   2. `bannerThen` — pulled from the synthetic step's `bannerInstructions`,
   *      same source as native under SDK authority, otherwise REST row.
   *   3. `chainInstruction` — JS-synthesised "Then {kind}" from `prog.nextStep
   *      .nextManeuverKind`; lowest priority because it can disagree with the
   *      native banner on highway merges (where native has no secondary but the
   *      synthesised "Then" misreads the upcoming maneuver kind).
   */
  const bannerThen = getBannerThenLine(step);
  const thenRaw = useMemo(() => {
    if (secondaryInstruction?.trim()) return secondaryInstruction.trim();
    if (bannerThen?.trim()) return bannerThen.trim();
    if (chainInstruction?.trim()) return chainInstruction.trim();
    return '';
  }, [secondaryInstruction, bannerThen, chainInstruction]);
  const thenStable = useStableText(thenRaw, stableTextKey);
  const thenText = thenStable || null;

  const showThenRow =
    !!thenText && (state === 'preview' || state === 'confirm' || state === 'active');

  const showSignal =
    signal &&
    signal.kind !== 'none' &&
    (state === 'active' || state === 'preview');

  const nativeLaneStripReady =
    !!effectiveLanes?.length &&
    nativeLaneAssets != null &&
    nativeLaneAssets.length === effectiveLanes.length &&
    nativeLaneAssets.every((a) => typeof a?.imageBase64 === 'string' && a.imageBase64.length > 0);
  /** Default: only the Navigation SDK bitmap strip (aligned with `LaneGuidance`). Set `EXPO_PUBLIC_NAV_LANE_UI=1` for full JS/REST lane row. */
  const showLanes =
    effectiveLanes &&
    effectiveLanes.length > 0 &&
    (state === 'active' || state === 'preview') &&
    (navLaneGuidanceUiEnabled() || nativeLaneStripReady);

  const showShields =
    shields &&
    shields.length > 0 &&
    (state === 'active' || state === 'preview' || state === 'cruise');

  const distScaleAnim = useSharedValue(1);
  const textOpacity = useSharedValue(1);
  const prevStateRef = useRef<TurnCardState | null>(null);

  useEffect(() => {
    const prev = prevStateRef.current;
    const targetScale =
      state === 'active' ? 1.06 :
      state === 'preview' ? 0.97 :
      1;
    const spring =
      mode === 'sport'
        ? { damping: 17, stiffness: 320, mass: 0.85 }
        : mode === 'calm'
          ? { damping: 22, stiffness: 200, mass: 0.95 }
          : { damping: 19, stiffness: 260, mass: 0.9 };
    distScaleAnim.value = withSpring(targetScale, spring);

    if (prev === 'preview' && state === 'active') {
      textOpacity.value = withSequence(
        withTiming(0.66, { duration: 105, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: mode === 'sport' ? 165 : 215, easing: Easing.in(Easing.cubic) }),
      );
    } else if (prev !== null && prev !== state) {
      textOpacity.value = 1;
    }
    prevStateRef.current = state;
  }, [state, mode]);

  const distAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: distScaleAnim.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const speedBoost = speedMph > 58 && state !== 'cruise' && state !== 'confirm' ? 1.05 : 1;
  const laneBoost = showLanes ? 1.04 : 1;

  const distFont = Math.round(42 * (state === 'active' ? 1.04 : 1) * d.distScale * speedBoost);
  const emphasizeArrow = state === 'active' || state === 'preview';
  const iconBox = Math.round((emphasizeArrow ? 68 : 62) * laneBoost * speedBoost);
  const iconRadius = emphasizeArrow ? 18 : 16;
  const iconGlyph = Math.round(34 * (emphasizeArrow ? 1 : 0.92) * laneBoost);

  const fadeMs = d.enterMs;

  return (
    <Animated.View entering={FadeIn.duration(fadeMs)} style={styles.wrap}>
      <LinearGradient
        colors={tcGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.grad,
          {
            borderRadius: tcRadius,
            paddingHorizontal: d.gradPadH,
            paddingTop: d.gradPadV,
            paddingBottom: d.gradPadB,
          },
          !isSportBorder && {
            borderWidth: d.borderW,
            borderColor: 'rgba(255,255,255,0.28)',
          },
          isSportBorder && {
            borderWidth: 1,
            borderColor: modeConfig.turnCardBorderColor ?? 'rgba(196,149,106,0.25)',
          },
          Platform.select({
            ios: {
              shadowColor: tcShadowColor,
              shadowOpacity: mode === 'calm' ? 0.42 : 0.48,
              shadowRadius: mode === 'sport' ? 14 : 18,
              shadowOffset: { width: 0, height: mode === 'sport' ? 4 : 5 },
            },
            android: { elevation: mode === 'sport' ? 12 : 14 },
            default: {},
          }),
        ]}
      >
        <View style={styles.row}>
          <Animated.View
            style={[
              styles.distCol,
              {
                minWidth: state === 'cruise' ? 56 : 72,
                marginRight: 6,
              },
              distAnimatedStyle,
            ]}
          >
            <Text
              style={[styles.distVal, { color: tcTextColor, fontSize: distFont }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {displayDistance.value}
            </Text>
            <Text style={[styles.distUnit, { color: tcTextColor }]}>{displayDistance.unit}</Text>
          </Animated.View>

          <View
            style={[
              styles.iconBoxOuter,
              {
                width: iconBox,
                height: iconBox,
                borderRadius: iconRadius,
                backgroundColor: modeConfig.turnCardIconBg,
                borderWidth: emphasizeArrow ? 2 : 1.5,
                borderColor: emphasizeArrow
                  ? 'rgba(255,255,255,0.34)'
                  : 'rgba(255,255,255,0.22)',
              },
            ]}
          >
            {hasRichManeuver ? (
              <ManeuverIcon
                type={maneuverType ?? ''}
                modifier={maneuverModifier ?? ''}
                fallbackKind={maneuverKind}
                size={iconGlyph}
                color={tcTextColor}
                exitNumber={roundaboutExitNumber}
              />
            ) : (
              <Ionicons name="arrow-up" size={iconGlyph} color={tcTextColor} />
            )}
          </View>

          <Animated.View style={[styles.textCol, textAnimatedStyle]}>
            {showShields && (
              <View style={styles.shieldRow}>
                <HighwayShieldBadge
                  shields={shields!}
                  textColor={tcTextColor}
                  maxShields={2}
                />
              </View>
            )}

            <Text
              style={[
                styles.primary,
                {
                  color: tcTextColor,
                  fontWeight: state === 'active' ? '800' : '700',
                },
              ]}
              numberOfLines={2}
            >
              {primaryDisplay}
            </Text>

            {showSignal && (
              <RoadSignalBadge
                kind={signal!.kind}
                label={signal!.label}
                textColor={tcTextColor}
              />
            )}

            {showThenRow && (
              <View style={styles.thenRow}>
                <Ionicons
                  name="return-down-forward-outline"
                  size={12}
                  color={tcTextColor}
                  style={{ opacity: d.thenOpacity }}
                />
                <Text
                  style={[
                    styles.secondary,
                    { color: tcTextColor, opacity: d.thenOpacity },
                  ]}
                  numberOfLines={1}
                >
                  {' '}{thenText}
                </Text>
              </View>
            )}
          </Animated.View>

          <TouchableOpacity
            style={styles.mute}
            onPress={onMutePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={16}
              color={tcTextColor}
              style={{ opacity: 0.85 }}
            />
          </TouchableOpacity>
        </View>

        {showLanes && (
          <LaneGuidance
            lanes={effectiveLanes!}
            nativeLaneAssets={nativeLaneAssets}
            activeColor={tcTextColor}
            inactiveColor={tcTextColor}
          />
        )}

        {roadDisambiguationLabel && !showShields && (
          <View style={styles.disambig}>
            <View style={styles.legacyShield}>
              <Text
                style={[styles.legacyShieldTxt, { color: tcTextColor }]}
                numberOfLines={1}
              >
                {roadDisambiguationLabel.length > 12
                  ? `${roadDisambiguationLabel.slice(0, 10)}…`
                  : roadDisambiguationLabel}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 10,
    marginTop: Platform.OS === 'ios' ? 4 : 8,
    overflow: 'hidden',
  },
  grad: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  distCol: { alignItems: 'center', flexShrink: 0, marginRight: 4 },
  distVal: { fontWeight: '900', letterSpacing: -1.8, lineHeight: 44 },
  distUnit: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: -2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconBoxOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 14,
    flexShrink: 0,
  },
  textCol: { flex: 1, minWidth: 0 },
  shieldRow: { marginBottom: 3 },
  primary: { fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },
  thenRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 2 },
  secondary: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 18 },
  mute: { paddingLeft: 8, paddingTop: 2, flexShrink: 0 },
  disambig: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  legacyShield: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  legacyShieldTxt: { fontSize: 10, fontWeight: '700' },
});
