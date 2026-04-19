/**
 * LaneGuidance — row of lane arrows showing which lanes are valid.
 *
 * Active lanes are highlighted, inactive lanes are dimmed.
 * Preferred lane gets an extra emphasis ring.
 *
 * Paths are closed fills in a 14×14 viewBox (Mapbox-style lane indications). The
 * straight/forward glyph has its tip at the top of the viewBox — i.e. “ahead” matches
 * the top of the turn card. Do not apply a Y-flip: flipping would invert that and point
 * forward toward the driver.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import type { LaneInfo, LaneIndication } from '../../navigation/navModel';
import { primaryLaneGlyph } from '../../navigation/laneIndication';

interface Props {
  lanes: LaneInfo[];
  activeColor: string;
  inactiveColor: string;
}

const VB = 14;

/** Filled arrow paths (Mapbox-style lane indications), 0–14 space. */
const ARROW_PATHS: Record<LaneIndication, string> = {
  straight:
    'M6 2v8l-2.5-2.5L2 9l5 5 5-5-1.5-1.5L8 10V2H6z',
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
        <Path d={path} fill={color} />
        {secondaryIndication ? (
          <G transform="translate(3.5, 3.5) scale(0.55)">
            <Path d={ARROW_PATHS[secondaryIndication] ?? ''} fill={color} opacity={0.45} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

export default React.memo(function LaneGuidance({ lanes, activeColor, inactiveColor }: Props) {
  if (!lanes.length) return null;

  return (
    <View style={styles.container}>
      {lanes.map((lane, i) => (
        <LaneArrow
          key={i}
          lane={lane}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
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
