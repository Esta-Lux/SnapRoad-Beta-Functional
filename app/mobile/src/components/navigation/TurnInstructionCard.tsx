import React, { useEffect, useRef } from 'react';
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
import LaneGuide from './LaneGuide';

function maneuverIcon(
  maneuver: string | undefined,
  color: string,
  size: number,
): React.ReactElement {
  const m = maneuver ?? 'straight';
  if (m === 'arrive') return <Ionicons name="flag" size={size} color={color} />;
  if (m === 'depart') return <Ionicons name="navigate" size={size} color={color} />;
  if (m === 'u-turn') return <Ionicons name="return-up-back-outline" size={size} color={color} />;
  if (m === 'roundabout') return <Ionicons name="sync-outline" size={size} color={color} />;
  if (m === 'merge') return <Ionicons name="git-merge-outline" size={size} color={color} />;
  if (m.includes('sharp-left')) return <Ionicons name="arrow-undo" size={size} color={color} />;
  if (m.includes('sharp-right')) return <Ionicons name="arrow-redo" size={size} color={color} />;
  if (m.includes('left')) return <Ionicons name="arrow-back" size={size} color={color} />;
  if (m.includes('right')) return <Ionicons name="arrow-forward" size={size} color={color} />;
  return <Ionicons name="arrow-up" size={size} color={color} />;
}

const DENSITY: Record<
  DrivingMode,
  {
    iconBox: number;
    iconRadius: number;
    iconGlyph: number;
    gradPadH: number;
    gradPadV: number;
    gradPadB: number;
    mainSize: number;
    secondSize: number;
    thenOpacity: number;
    borderW: number;
    enterMs: number;
    distScale: number;
  }
> = {
  calm: {
    iconBox: 46,
    iconRadius: 15,
    iconGlyph: 26,
    gradPadH: 16,
    gradPadV: 14,
    gradPadB: 12,
    mainSize: 17,
    secondSize: 13,
    thenOpacity: 0.72,
    borderW: StyleSheet.hairlineWidth * 2,
    enterMs: 480,
    distScale: 0.94,
  },
  adaptive: {
    iconBox: 44,
    iconRadius: 14,
    iconGlyph: 25,
    gradPadH: 15,
    gradPadV: 12,
    gradPadB: 10,
    mainSize: 18,
    secondSize: 13,
    thenOpacity: 0.7,
    borderW: StyleSheet.hairlineWidth * 2,
    enterMs: 380,
    distScale: 1,
  },
  sport: {
    iconBox: 40,
    iconRadius: 12,
    iconGlyph: 24,
    gradPadH: 14,
    gradPadV: 10,
    gradPadB: 9,
    mainSize: 17,
    secondSize: 12,
    thenOpacity: 0.64,
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
  lanesJson?: string;
  /** Rare: highway shield / long-name disambiguation */
  roadDisambiguationLabel?: string | null;
  isSportBorder: boolean;
  /** Highway / urgent contexts — slightly larger distance + icon */
  speedMph?: number;
};

export default React.memo(function TurnInstructionCard({
  mode,
  modeConfig,
  state,
  distanceValue,
  distanceUnit,
  primaryInstruction,
  secondaryInstruction,
  maneuverForIcon,
  isMuted,
  onMutePress,
  lanesJson,
  roadDisambiguationLabel,
  isSportBorder,
  speedMph = 0,
}: TurnInstructionCardProps) {
  const tcGrad = modeConfig.turnCardGradient;
  const tcRadius = modeConfig.turnCardRadius;
  const tcShadowColor = modeConfig.turnCardShadowColor;
  const tcTextColor = modeConfig.turnCardTextColor;
  const d = DENSITY[mode];

  const distScale = useSharedValue(1);
  const textOpacity = useSharedValue(1);
  const prevStateRef = useRef<TurnCardState | null>(null);

  useEffect(() => {
    const prev = prevStateRef.current;
    const targetScale =
      state === 'active' ? 1.08 :
      state === 'preview' ? 0.96 :
      1;
    const spring =
      mode === 'sport'
        ? { damping: 17, stiffness: 320, mass: 0.85 }
        : mode === 'calm'
          ? { damping: 22, stiffness: 200, mass: 0.95 }
          : { damping: 19, stiffness: 260, mass: 0.9 };
    distScale.value = withSpring(targetScale, spring);

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
    transform: [{ scale: distScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const speedBoost = speedMph > 58 && state !== 'cruise' && state !== 'confirm' ? 1.07 : 1;
  const laneBoost = lanesJson && (state === 'active' || state === 'preview') ? 1.06 : 1;

  const distFont = Math.round(
    modeConfig.distanceFontSize * (state === 'active' ? 1.05 : 1) * d.distScale * speedBoost,
  );

  const emphasizeArrow = state === 'active' || state === 'preview';
  const iconBox = Math.round(d.iconBox * (emphasizeArrow ? 1 : 0.92) * laneBoost * speedBoost);
  const iconGlyph = Math.round(d.iconGlyph * (emphasizeArrow ? 1 : 0.9) * laneBoost * speedBoost);
  const showSecond = !!secondaryInstruction && (state === 'preview' || state === 'confirm');

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
            ios: { shadowColor: tcShadowColor, shadowOpacity: mode === 'calm' ? 0.42 : 0.48, shadowRadius: mode === 'sport' ? 14 : 18, shadowOffset: { width: 0, height: mode === 'sport' ? 4 : 5 } },
            android: { elevation: mode === 'sport' ? 12 : 14 },
            default: {},
          }),
        ]}
      >
        <View style={styles.row}>
          <Animated.View
            style={[
              styles.distCol,
              { minWidth: state === 'cruise' ? 52 : 56 },
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
              styles.iconBox,
              {
                width: iconBox,
                height: iconBox,
                borderRadius: d.iconRadius,
                backgroundColor: modeConfig.turnCardIconBg,
                borderWidth: emphasizeArrow ? 1.5 : 1,
                borderColor: emphasizeArrow ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.22)',
              },
            ]}
          >
            {maneuverIcon(maneuverForIcon, tcTextColor, iconGlyph)}
          </View>

          <Animated.View style={[styles.textCol, textAnimatedStyle]}>
            <Text
              style={[
                styles.primary,
                {
                  color: tcTextColor,
                  fontSize: d.mainSize,
                  fontWeight: state === 'active' ? '800' : '700',
                },
              ]}
              numberOfLines={state === 'cruise' ? 2 : 3}
            >
              {primaryInstruction}
            </Text>
            {showSecond && (
              <View style={styles.thenRow}>
                <Ionicons name="return-down-forward-outline" size={11} color={tcTextColor} style={{ opacity: d.thenOpacity }} />
                <Text
                  style={[
                    styles.secondary,
                    {
                      color: tcTextColor,
                      fontSize: d.secondSize,
                      opacity: d.thenOpacity,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {secondaryInstruction}
                </Text>
              </View>
            )}
          </Animated.View>

          <TouchableOpacity
            style={styles.mute}
            onPress={onMutePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={16} color={tcTextColor} style={{ opacity: 0.85 }} />
          </TouchableOpacity>
        </View>

        {lanesJson ? (
          <View style={{ marginTop: 8 }}>
            <LaneGuide lanes={lanesJson} activeColor="#ffffff" inactiveColor="rgba(255,255,255,0.25)" />
          </View>
        ) : null}

        {roadDisambiguationLabel ? (
          <View style={styles.disambig}>
            <View style={styles.shield}>
              <Text style={[styles.shieldTxt, { color: tcTextColor }]} numberOfLines={1}>
                {roadDisambiguationLabel.length > 12
                  ? `${roadDisambiguationLabel.slice(0, 10)}…`
                  : roadDisambiguationLabel}
              </Text>
            </View>
          </View>
        ) : null}
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
  distVal: { fontWeight: '900', letterSpacing: -1.2 },
  distUnit: { fontSize: 11, fontWeight: '700', marginTop: -2, textTransform: 'uppercase', letterSpacing: 0.45 },
  iconBox: { justifyContent: 'center', alignItems: 'center', marginHorizontal: 10, flexShrink: 0 },
  textCol: { flex: 1, minWidth: 0 },
  primary: { letterSpacing: -0.25, lineHeight: 22 },
  thenRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 5, gap: 4 },
  secondary: { flex: 1, fontWeight: '600', lineHeight: 17 },
  mute: { paddingLeft: 8, paddingTop: 2, flexShrink: 0 },
  disambig: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  shield: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  shieldTxt: { fontSize: 10, fontWeight: '700' },
});
