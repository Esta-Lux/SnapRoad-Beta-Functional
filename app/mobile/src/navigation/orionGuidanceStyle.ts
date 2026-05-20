import type { NavStep } from './navModel';
import type { DrivingMode } from '../types';
import { composeOrionTurnCue, type OrionTurnCueBucket } from './orionNavScript';

export type GuidanceBucket = 'preparatory' | 'advance' | 'imminent';

type OrionGuidanceContext = {
  bucket: GuidanceBucket;
  step: NavStep;
  distanceMeters: number;
  drivingMode?: DrivingMode;
  userName?: string;
};

export function orionizeNavigationUtterance(base: string, ctx: OrionGuidanceContext): string {
  const clean = base.trim();
  if (!clean) return clean;

  const bucket: OrionTurnCueBucket = ctx.bucket;
  return composeOrionTurnCue({
    bucket,
    instruction: clean,
    seed: `${ctx.step.index}:${ctx.step.kind}:${ctx.bucket}`,
    kind: ctx.step.kind,
    userName: ctx.userName,
    drivingMode: ctx.drivingMode,
  });
}
