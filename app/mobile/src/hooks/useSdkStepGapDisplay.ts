import { useMemo, useRef } from 'react';
import type {
  LaneInfo,
  ManeuverKind,
  NavigationProgress,
  RoadShield,
  RoadSignal,
} from '../navigation/navModel';

/** Wider gate reduces spurious gap-mode when native briefly omits primary near maneuvers. */
const GAP_MAX_DIST_M = 148;
const FRAC_CUE = 0.805;

function stepKey(np: NavigationProgress): string {
  const i = np.nativeStepIdentity;
  return `${i?.legIndex ?? 0}|${i?.stepIndex ?? 0}`;
}

function holdFromNonEmpty(live: NavigationProgress) {
  const b = live.banner;
  const ns = live.nextStep;
  const mKey = ns?.kind === 'unknown' || ns?.kind == null ? 'straight' : String(ns.kind);
  const mk = (ns?.kind ?? b?.maneuverKind ?? 'straight') as ManeuverKind;
  const sig = ns?.signal;
  const holdSignal: RoadSignal | undefined =
    sig && sig.kind !== 'none' && (sig.label?.trim() ?? '') !== '' ? sig : undefined;
  return {
    holdPrimary: (b?.primaryInstruction ?? '').replace(/\s+/g, ' ').trim(),
    holdSecondary: b?.secondaryInstruction?.replace(/\s+/g, ' ').trim() || undefined,
    holdManeuverIcon: mKey,
    holdManKind: mk,
    holdRawType: ns?.rawType ?? '',
    holdRawMod: ns?.rawModifier ?? '',
    holdSignal,
    holdLanes: ns?.lanes && ns.lanes.length ? ns.lanes : [],
    holdShields: ns?.shields && ns.shields.length ? ns.shields : [],
    holdRoundaboutExit: ns?.roundaboutExitNumber ?? null,
  };
}

export type SdkStepGapDisplay = {
  holdPrimary: string;
  holdSecondary: string | undefined;
  holdManeuverIcon: string;
  holdManKind: ManeuverKind;
  holdRawType: string;
  holdRawMod: string;
  holdSignal?: RoadSignal;
  holdLanes: LaneInfo[];
  holdShields: RoadShield[];
  holdRoundaboutExit: number | null;
} | null;

const continuing: NonNullable<SdkStepGapDisplay> = {
  holdPrimary: 'Continuing…',
  holdSecondary: undefined,
  holdManeuverIcon: 'straight',
  holdManKind: 'straight',
  holdRawType: '',
  holdRawMod: '',
  holdSignal: undefined,
  holdLanes: [],
  holdShields: [],
  holdRoundaboutExit: null,
};

/**
 * Mapbox can emit 0.5–2s gaps at step boundaries (empty `primaryInstruction` while still
 * navigating). In that window, re-show the last good native snapshot for the same leg/step
 * or a neutral "Continuing…" when the step id has already advanced.
 * Distance to the next maneuver is **not** part of this hold — MapScreen drives it from the
 * latest `sdkNavProgress` + `sdkManeuverDisplayDistanceFromProgress` so it matches native.
 */
export function useSdkStepGapDisplay(
  isNavigating: boolean,
  live: NavigationProgress | null,
): SdkStepGapDisplay {
  const lastGood = useRef<{ id: string; d: NonNullable<SdkStepGapDisplay> } | null>(null);

  return useMemo(() => {
    if (!isNavigating || !live || live.instructionSource !== 'sdk') {
      lastGood.current = null;
      return null;
    }
    const id = stepKey(live);
    const mRaw = live.nextStepDistanceMeters;
    const m = typeof mRaw === 'number' && Number.isFinite(mRaw) ? mRaw : 0;
    const fr =
      typeof live.nativeFractionTraveled === 'number' && Number.isFinite(live.nativeFractionTraveled)
        ? live.nativeFractionTraveled
        : 0;
    const inGapZone = m < GAP_MAX_DIST_M || fr > FRAC_CUE;
    const primary = (live.banner?.primaryInstruction ?? '').replace(/\s+/g, ' ').trim();

    if (primary) {
      lastGood.current = { id, d: holdFromNonEmpty(live) };
      return null;
    }

    if (!inGapZone) {
      return null;
    }

    const prev = lastGood.current;
    if (prev && prev.id === id) {
      return prev.d;
    }

    return { ...continuing };
  }, [
    isNavigating,
    live,
    live?.nativeStepIdentity?.legIndex,
    live?.nativeStepIdentity?.stepIndex,
    live?.banner?.primaryInstruction,
    live?.nextStepDistanceMeters,
    live?.nativeFractionTraveled,
  ]);
}
