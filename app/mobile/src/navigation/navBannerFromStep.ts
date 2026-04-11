import type { NavBannerModel, NavStep } from './navModel';

/** Rich banner fields for TurnInstructionCard (synced with voice via NavStep). */
export function bannerFieldsFromNavStep(step: NavStep | null): Omit<NavBannerModel, 'primaryDistanceMeters'> | null {
  if (!step) return null;

  return {
    primaryInstruction: step.displayInstruction,
    secondaryInstruction: step.secondaryInstruction,
    subInstruction: step.subInstruction,
    signal: step.signal,
    lanes: step.lanes,
    shields: step.shields,
    maneuverKind: step.kind,
    roundaboutExitNumber: step.roundaboutExitNumber,
  };
}
