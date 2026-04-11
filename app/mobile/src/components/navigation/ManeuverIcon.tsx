/**
 * ManeuverIcon — proper navigation turn arrows rendered as SVG.
 *
 * Each ManeuverKind gets a purpose-built path that looks like what you
 * see in Google Maps / Waze / Apple Maps turn cards:
 *   - Curved turn arrows (not flat Ionicons)
 *   - Highway-specific shapes (merge, ramp, fork, keep)
 *   - Roundabout with directional rotation + exit number
 *   - U-turn with proper loop
 */

import React from 'react';
import Svg, { Path, G, Circle, Text as SvgText } from 'react-native-svg';
import type { ManeuverKind } from '../../navigation/navModel';

interface Props {
  kind: ManeuverKind;
  size: number;
  color: string;
  /** Roundabout exit number (1-based). */
  exitNumber?: number | null;
}

/**
 * SVG paths in a 24×24 viewBox.
 * Each path is designed to be instantly recognizable at 32-68px rendered size.
 *
 * Street maneuvers: curved arrows showing the turn arc
 * Highway maneuvers: Y-splits, merge joins, ramp curves
 */
const PATHS: Record<ManeuverKind, string> = {
  // ── Street turns (curved arrows) ──
  turn_left:
    'M12 3v10c0 1.1-.9 2-2 2H5l3.5-3.5L7.1 10.1 2 15.2l5.1 5.1 1.4-1.4L5 15.4h5c2.2 0 4-1.8 4-4V3h-2z',
  turn_right:
    'M12 3v10c0 1.1.9 2 2 2h5l-3.5-3.5 1.4-1.4L22 15.2l-5.1 5.1-1.4-1.4 3.5-3.5h-5c-2.2 0-4-1.8-4-4V3h2z',
  sharp_left:
    'M12 3v6l-6 6 1.4 1.4L11 12.8V3h2zm-6.6 7.6L4 12l5.1 5.1 1.4-1.4L7.8 13l1.6-1.6-1.4-1.4z',
  sharp_right:
    'M12 3v6l6 6-1.4 1.4L13 12.8V3h-2zm6.6 7.6L20 12l-5.1 5.1-1.4-1.4 2.7-2.7-1.6-1.6 1.4-1.4z',
  slight_left:
    'M12 3v12.6l-4.2-2.8-1.1 1.6 6.3 4.2 6.3-4.2-1.1-1.6-4.2 2.8V3h-2zm-3.3 10.6l-1.4 1 3.7 2.5V14l-2.3 1.5z',
  slight_right:
    'M12 3v12.6l4.2-2.8 1.1 1.6-6.3 4.2-6.3-4.2 1.1-1.6 4.2 2.8V3h2zm3.3 10.6l1.4 1-3.7 2.5V14l2.3 1.5z',
  straight:
    'M11 3h2v14.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4 3.6 3.6V3z',
  uturn:
    'M18 9c0-3.3-2.7-6-6-6S6 5.7 6 9v7.2l-3.6-3.6L1 14l6 6 6-6-1.4-1.4L8 16.2V9c0-2.2 1.8-4 4-4s4 1.8 4 4v2h2V9z',

  // ── Highway maneuvers ──
  merge_left:
    'M7 3v6.6L3.5 13l1.4 1.4L7 12.1V21h2v-9.9l4.5 3.3 1-1.6L9 9V3H7zm8 0v18h2V3h-2z',
  merge_right:
    'M17 3v6.6l3.5 3.4-1.4 1.4-2.1-2.1V21h-2v-9.9l-4.5 3.3-1-1.6L15 9V3h2zM7 3v18H5V3h2z',
  merge:
    'M12 3v5.5l-4 4L9.4 14l2.6-2.6 2.6 2.6 1.4-1.4-4-4V3h-2zM12 14v7h-2v-7h2zm0 0h2v7h-2v-7z',
  on_ramp_left:
    'M6 3v8c0 2.2 1.8 4 4 4h4.2l-3.6 3.6 1.4 1.4 6-6-6-6-1.4 1.4 3.6 3.6H10c-1.1 0-2-.9-2-2V3H6z',
  on_ramp_right:
    'M18 3v8c0 2.2-1.8 4-4 4H9.8l3.6 3.6-1.4 1.4-6-6 6-6 1.4 1.4L9.8 13H14c1.1 0 2-.9 2-2V3h2z',
  off_ramp_left:
    'M5 21v-8c0-2.2 1.8-4 4-4h4.2l-3.6-3.6L11 4l6 6-6 6-1.4-1.4L13.2 11H9c-1.1 0-2 .9-2 2v8H5z',
  off_ramp_right:
    'M19 21v-8c0-2.2-1.8-4-4-4h-4.2l3.6-3.6L13 4 7 10l6 6 1.4-1.4L10.8 11H15c1.1 0 2 .9 2 2v8h2z',
  fork_left:
    'M11 3v7.5L7.5 14l1.4 1.4L11 13.2V21h2V3h-2zm5 0v18h2V3h-2z',
  fork_right:
    'M13 3v7.5l3.5 3.5-1.4 1.4L13 13.2V21h-2V3h2zM7 3v18H5V3h2z',
  keep_left:
    'M9 3v8.2l-3.6-3.6L4 9l6 6 6-6-1.4-1.4L11 11.2V3H9zm8 0v18h2V3h-2z',
  keep_right:
    'M15 3v8.2l3.6-3.6L20 9l-6 6-6-6 1.4-1.4L13 11.2V3h2zM5 3v18H3V3h2z',

  // ── Roundabout (base circle + exit arrow — exit direction handled by rotation) ──
  roundabout_left:
    'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-13v3.2L7.5 13.6l1.4 1.4L12 11.9V7h-1z',
  roundabout_right:
    'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm1-13v3.2l3.5 3.4-1.4 1.4L12 11.9V7h1z',
  roundabout_straight:
    'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-13v8h2V7h-2z',
  rotary:
    'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm0-14a6 6 0 100 12 6 6 0 000-12zm0 10a4 4 0 110-8 4 4 0 010 8z',

  // ── Terminal / other ──
  arrive:
    'M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
  depart:
    'M12 2l6 6-1.4 1.4L13 5.8V16h-2V5.8L7.4 9.4 6 8l6-6zm-7 16v2h14v-2H5z',
  notification:
    'M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.1-1.6-5.6-4.5-6.3V4a1.5 1.5 0 00-3 0v.7C7.6 5.4 6 7.9 6 11v5l-2 2v1h16v-1l-2-2z',
  continue:
    'M11 3h2v14.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4 3.6 3.6V3z',
  unknown:
    'M11 3h2v14.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4 3.6 3.6V3z',
};

function exitBadgeTextFill(iconColor: string): string {
  const c = iconColor.toLowerCase();
  if (c === '#ffffff' || c === '#fff') return '#000';
  return '#fff';
}

export default React.memo(function ManeuverIcon({ kind, size, color, exitNumber }: Props) {
  const path = PATHS[kind] ?? PATHS.unknown;
  const isRoundabout =
    kind === 'roundabout_left' ||
    kind === 'roundabout_right' ||
    kind === 'roundabout_straight' ||
    kind === 'rotary';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={path} fill={color} />
      {isRoundabout && exitNumber != null && exitNumber >= 1 && (
        <G>
          <Circle cx={18} cy={6} r={5.5} fill={color} />
          <SvgText
            x={18}
            y={8.5}
            textAnchor="middle"
            fontSize={8}
            fontWeight="800"
            fill={exitBadgeTextFill(color)}
          >
            {exitNumber}
          </SvgText>
        </G>
      )}
    </Svg>
  );
});
