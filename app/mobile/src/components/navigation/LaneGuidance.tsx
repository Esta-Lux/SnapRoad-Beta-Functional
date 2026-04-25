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
import { View, StyleSheet, Image } from 'react-native';
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

const VB = 14;
const VB_CENTER = VB / 2;

/**
 * SVG rotation (viewBox). Default `0`: straight path tip is at the top (“ahead” = up toward the
 * top-stacked turn card). Native bitmap rotation: `laneHudOrientation` (iOS / Android can differ).
 */
const LANE_GLYPH_ROTATION_FIX_DEG = 0;

/** Filled arrow paths (Mapbox-style lane indications), 0–14 space. */
const ARROW_PATHS: Record<LaneIndication, string> = {
  straight: LANE_SVG_STRAIGHT,
  left: 'M2 7l5-5v3h5v4H7v3L2 7z',
  slight_left: 'M3 4l4-2v2.5l4 3v4l-4-3V11L3 4z',
  right: 'M12 7l-5-5v3H2v4h5v3l5-5z',
  slight_right: 'M11 4l-4-2v2.5l-4 3v4l4-3V11l4-7z',
  uturn:
    'M10 2C7.2 2 5 4.2 5 7v3l-2.5-2.5L1 9l5 5 5-5-1.5-1.5L7 10V7c0-1.7 1.3-3 3-3s3 1.3 3 3v2h2V7c0-2.8-2.2-5-5-5z',
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
  const color = active ? activeColor : inactiveColor;
  const opacity = active ? 1.0 : 0.3;
  const secondaryIndication = indications.find((g) => g !== primaryIndication);

  return (
    <View
      style={[
        styles.laneSlot,
        preferred && active && styles.preferredSlot,
        preferred && active && { borderColor: activeColor },
      ]}
    >
      <Svg width={18} height={18} viewBox={`0 0 ${VB} ${VB}`} style={{ opacity }}>
        <G transform={`rotate(${LANE_GLYPH_ROTATION_FIX_DEG}, ${VB_CENTER}, ${VB_CENTER})`}>
          <Path d={path} fill={color} />
          {secondaryIndication ? (
            <G transform="translate(3.5, 3.5) scale(0.55)">
              <Path d={ARROW_PATHS[secondaryIndication] ?? ''} fill={color} opacity={0.45} />
            </G>
          ) : null}
        </G>
      </Svg>
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
        lane.preferred && lane.active && styles.preferredSlot,
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
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  preferredSlot: {
    borderWidth: 1.5,
    borderRadius: 6,
  },
});
