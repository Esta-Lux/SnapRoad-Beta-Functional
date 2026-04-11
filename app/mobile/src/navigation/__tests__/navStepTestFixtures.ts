import type { NavStep } from '../navModel';

const emptySignal = { kind: 'none' as const, label: '' };

/**
 * Minimal valid {@link NavStep} for ETA / edge unit tests — only distance + duration fields matter.
 */
export function minimalNavStep(
  overrides: Partial<NavStep> &
    Pick<
      NavStep,
      | 'index'
      | 'segmentIndex'
      | 'kind'
      | 'distanceMetersFromStart'
      | 'distanceMetersToNext'
      | 'durationSeconds'
    >,
): NavStep {
  const distanceMeters =
    overrides.distanceMeters ?? Math.max(0, overrides.distanceMetersToNext);
  return {
    rawType: '',
    rawModifier: '',
    bearingAfter: 0,
    displayInstruction: '',
    secondaryInstruction: null,
    subInstruction: null,
    instruction: '',
    streetName: null,
    destinationRoad: null,
    shields: [],
    signal: emptySignal,
    lanes: [],
    roundaboutExitNumber: null,
    voiceAnnouncement: null,
    nextManeuverKind: null,
    nextManeuverStreet: null,
    nextManeuverDistanceMeters: null,
    ...overrides,
    distanceMeters,
  };
}
