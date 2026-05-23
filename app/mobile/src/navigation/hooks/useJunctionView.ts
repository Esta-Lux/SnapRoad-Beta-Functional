import { useMemo } from 'react';
import type { ManeuverKind, NavStep } from '../navModel';

const JUNCTION_KINDS = new Set<ManeuverKind>([
  'off_ramp_left',
  'off_ramp_right',
  'on_ramp_left',
  'on_ramp_right',
  'fork_left',
  'fork_right',
  'merge',
  'merge_left',
  'merge_right',
  'keep_left',
  'keep_right',
]);

export function useJunctionView(args: {
  step?: NavStep | null;
  distanceMeters: number;
  speedMph: number;
}) {
  return useMemo(() => {
    const step = args.step ?? null;
    const visible = Boolean(
      step &&
        JUNCTION_KINDS.has(step.kind) &&
        args.distanceMeters >= 50 &&
        args.distanceMeters <= 500 &&
        args.speedMph > 20 &&
        step.lanes.length > 0 &&
        (step.shields.length > 0 || step.exitNumber || step.destinationRoad || step.streetName),
    );
    return {
      visible,
      step,
      distanceMeters: args.distanceMeters,
    };
  }, [args.step, args.distanceMeters, args.speedMph]);
}
