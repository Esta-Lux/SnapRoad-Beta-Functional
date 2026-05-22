/**
 * LaneGuidance — row of lane arrows showing which lanes are valid.
 *
 * Native `onRouteProgressChanged` supplies `lanes[]` (indications + active/valid).
 * When the bridge sends per-lane bitmaps (`nativeLaneAssets`, same length as `lanes`),
 * those render as PNGs; otherwise we draw indications with local SVG paths.
 *
 * Active lanes are highlighted, inactive lanes are dimmed.
 * Preferred lane gets an extra emphasis ring.
 */

import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import type { LaneInfo, LaneIndication } from '../../navigation/navModel';
import type { NativeLaneAsset } from '../../navigation/navSdkMirrorTypes';
import { primaryLaneGlyph } from '../../navigation/laneIndication';
import { LANE_SVG_STRAIGHT } from '../../navigation/laneSvgPaths';
import { NATIVE_LANE_BITMAP_ROTATE } from '../../navigation/laneHudOrientation';

interface Props {
  lanes: LaneInfo[];
  /** When present and aligned with `lanes.length`, render native PNGs instead of SVG. */
  nativeLaneAssets?: NativeLaneAsset[] | null;
  activeColor: string;
  inactiveColor: string;
}

const VB = 24;
const VB_CENTER = VB / 2;

/**
 * SVG rotation (viewBox). Default `0`: straight path tip is at the top (“ahead” = up toward the
 * top-stacked turn card). Native bitmap rotation: `laneHudOrientation` (iOS / Android can differ).
 */
const LANE_GLYPH_ROTATION_FIX_DEG = 0;

/** Stroke arrow paths. Forward is always up toward the turn card, never down. */
const ARROW_PATHS: Record<LaneIndication, string> = {
  straight: LANE_SVG_STRAIGHT,
  left: 'M14 21V10H5M9 6l-4 4 4 4',
  slight_left: 'M13 21V11L7 5M7 11V5h6',
  right: 'M10 21V10h9M15 6l4 4-4 4',
  slight_right: 'M11 21V11l6-6M17 11V5h-6',
  uturn:
    'M9 21V9c0-4.5 8-4.5 8 0v5M13 10l4 4 4-4',
};

function LaneArrow({
  lane,
  activeColor,
  inactiveColor,
}: {
  lane: LaneInfo;
  activeColor: string;
  inactiveColor: string;
}) {
  const { indications, active, preferred } = lane;
  const primaryIndication = primaryLaneGlyph(lane);
  const path = ARROW_PATHS[primaryIndication] ?? ARROW_PATHS.straight;
  const recommended = preferred && active;
  const color = recommended ? '#FFFFFF' : active ? activeColor : inactiveColor;
  const opacity = active ? 1.0 : 0.45;
  const secondaryIndication = indications.find((g) => g !== primaryIndication);

  return (
    <View
      style={[
        styles.laneSlot,
        active && styles.validSlot,
        recommended && styles.recommendedSlot,
      ]}
    >
      <Svg width={recommended ? 25 : 23} height={recommended ? 25 : 23} viewBox={`0 0 ${VB} ${VB}`} style={{ opacity }}>
        <G transform={`rotate(${LANE_GLYPH_ROTATION_FIX_DEG}, ${VB_CENTER}, ${VB_CENTER})`}>
          <Path
            d={path}
            stroke={color}
            strokeWidth={recommended ? 2.8 : 2.35}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {secondaryIndication ? (
            <G transform="translate(6, 6) scale(0.55)">
              <Path
                d={ARROW_PATHS[secondaryIndication] ?? ''}
                stroke={color}
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
            </G>
          ) : null}
        </G>
      </Svg>
      {recommended ? <Text style={styles.recommendedLabel}>USE</Text> : null}
    </View>
  );
}

function LaneNativeBitmap({
  lane,
  asset,
}: {
  lane: LaneInfo;
  asset: NativeLaneAsset;
}) {
  const w = asset.width ?? 26;
  const h = asset.height ?? 26;
  const opacity = lane.active ? 1.0 : 0.3;
  const uri = `data:image/png;base64,${asset.imageBase64}`;

  return (
    <View
      style={[
        styles.laneSlot,
        lane.active && styles.validSlot,
        lane.preferred && lane.active && styles.recommendedSlot,
        lane.preferred && lane.active && { borderColor: 'rgba(255,255,255,0.55)' },
      ]}
    >
      <Image
        source={{ uri }}
        style={{
          width: w,
          height: h,
          opacity,
          transform: [{ rotate: NATIVE_LANE_BITMAP_ROTATE }],
        }}
        resizeMode="contain"
      />
    </View>
  );
}

export default React.memo(function LaneGuidance({
  lanes,
  nativeLaneAssets,
  activeColor,
  inactiveColor,
}: Props) {
  if (!lanes.length) return null;

  const useNative =
    nativeLaneAssets != null &&
    nativeLaneAssets.length === lanes.length &&
    nativeLaneAssets.every((a) => typeof a.imageBase64 === 'string' && a.imageBase64.length > 0);

  return (
    <View style={styles.container}>
      {useNative
        ? lanes.map((lane, i) => (
            <LaneNativeBitmap key={i} lane={lane} asset={nativeLaneAssets![i]} />
          ))
        : lanes.map((lane, i) => (
            <LaneArrow key={i} lane={lane} activeColor={activeColor} inactiveColor={inactiveColor} />
          ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  laneSlot: {
    width: 38,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
    backgroundColor: 'rgba(17,24,39,0.58)',
  },
  validSlot: {
    backgroundColor: 'rgba(31,41,55,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  recommendedSlot: {
    width: 42,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  recommendedLabel: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginTop: 1,
  },
});
