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
import { getBannerThenLine, getLaneData, lanesFromLegacyJson } from '../../navigation/bannerInstructions';
import ManeuverIcon from './ManeuverIcon';
import RoadSignalBadge from './RoadSignalBadge';
import LaneGuidance from './LaneGuidance';
import HighwayShieldBadge from './HighwayShieldBadge';

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
}: TurnInstructionCardProps) {
  const tcGrad = modeConfig.turnCardGradient;
  const tcRadius = modeConfig.turnCardRadius;
  const tcShadowColor = modeConfig.turnCardShadowColor;
  const tcTextColor = modeConfig.turnCardTextColor;
  const d = DENSITY[mode];

  const primaryDisplay = useMemo(() => {
    const fromParent = primaryInstruction?.trim();
    if (fromParent) return fromParent;
    return step?.bannerInstructions?.[0]?.primary?.text?.trim() || '';
  }, [step, primaryInstruction]);

  const hasRawManeuver = !!(maneuverType?.trim() || maneuverModifier?.trim());
  const hasKindManeuver = maneuverKind != null && maneuverKind !== 'unknown';
  const hasRichManeuver = hasRawManeuver || hasKindManeuver;

  const effectiveLanes = useMemo((): LaneInfo[] | null => {
    if (lanes?.length) return lanes;
    const json = getLaneData(step) ?? lanesJson;
    return lanesFromLegacyJson(json);
  }, [lanes, step, lanesJson]);

  const bannerThen = getBannerThenLine(step);
  const thenText = useMemo(() => {
    if (chainInstruction?.trim()) return chainInstruction.trim();
    if (bannerThen?.trim()) return bannerThen.trim();
    if (secondaryInstruction?.trim()) return secondaryInstruction.trim();
    return null;
  }, [chainInstruction, bannerThen, secondaryInstruction]);

  const showThenRow =
    !!thenText && (state === 'preview' || state === 'confirm' || state === 'active');

  const showSignal =
    signal &&
    signal.kind !== 'none' &&
    (state === 'active' || state === 'preview');

  const showLanes =
    effectiveLanes &&
    effectiveLanes.length > 0 &&
    (state === 'active' || state === 'preview');

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
              { minWidth: state === 'cruise' ? 56 : 60 },
              distAnimatedStyle,
            ]}
          >
            <Text
              style={[styles.distVal, { color: tcTextColor, fontSize: distFont }]}
              numberOfLines={1}
            >
              {distanceValue}
            </Text>
            <Text style={[styles.distUnit, { color: tcTextColor }]}>{distanceUnit}</Text>
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
