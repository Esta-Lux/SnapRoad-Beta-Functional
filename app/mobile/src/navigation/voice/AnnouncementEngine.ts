import type { DrivingMode } from '../../types';
import type { NavStep } from '../navModel';
import { thresholdsForSpeed } from '../config/announcementConfig';
import {
  nextAnnouncementCue,
  resetAnnouncementState,
  type AnnouncementCuePhase,
  type ManeuverAnnouncementState,
} from './AnnouncementStateMachine';

export type AnnouncementDecision = {
  state: ManeuverAnnouncementState;
  cue: AnnouncementCuePhase | null;
};

export function evaluateManeuverAnnouncement(args: {
  state: ManeuverAnnouncementState | null;
  step: NavStep;
  distanceMeters: number;
  speedMph: number;
  nowMs: number;
  isNow?: boolean;
}): AnnouncementDecision {
  const thresholds = thresholdsForSpeed(args.speedMph);
  const state = resetAnnouncementState(args.state, args.step.index, thresholds);
  return nextAnnouncementCue({
    state,
    distanceMeters: args.distanceMeters,
    nowMs: args.nowMs,
    isNow: args.isNow,
  });
}

export function orionPersonalityLine(drivingMode: DrivingMode): string {
  if (drivingMode === 'sport') return 'This is it.';
  if (drivingMode === 'calm') return 'Here we go.';
  return 'Stay focused now.';
}
