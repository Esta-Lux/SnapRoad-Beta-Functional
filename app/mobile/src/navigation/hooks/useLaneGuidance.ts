import { useMemo } from 'react';
import type { LaneInfo, ManeuverKind } from '../navModel';

const GUIDANCE_KINDS = new Set<ManeuverKind>([
  'turn_left',
  'turn_right',
  'sharp_left',
  'sharp_right',
  'slight_left',
  'slight_right',
  'merge',
  'merge_left',
  'merge_right',
  'fork_left',
  'fork_right',
  'on_ramp_left',
  'on_ramp_right',
  'off_ramp_left',
  'off_ramp_right',
  'roundabout_left',
  'roundabout_right',
  'roundabout_straight',
  'rotary',
  'keep_left',
  'keep_right',
]);

export function shouldShowLaneGuidance(args: {
  distanceMeters: number;
  kind?: ManeuverKind | null;
  lanes?: LaneInfo[] | null;
}): boolean {
  const { distanceMeters, kind, lanes } = args;
  return Boolean(
    lanes?.length &&
      kind &&
      GUIDANCE_KINDS.has(kind) &&
      distanceMeters < 500 &&
      distanceMeters > 30,
  );
}

export function useLaneGuidance(args: {
  distanceMeters: number;
  kind?: ManeuverKind | null;
  lanes?: LaneInfo[] | null;
}) {
  return useMemo(
    () => ({
      visible: shouldShowLaneGuidance(args),
      lanes: args.lanes ?? [],
      totalLanes: args.lanes?.length ?? 0,
      recommendedLaneIndex: Math.max(0, (args.lanes ?? []).findIndex((lane) => lane.preferred || lane.active)),
      distanceToLaneChange: args.distanceMeters,
    }),
    [args.distanceMeters, args.kind, args.lanes],
  );
}
