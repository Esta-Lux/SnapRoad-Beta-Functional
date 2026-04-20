import { useEffect, useMemo, useRef } from 'react';
import type { DrivingMode } from '../types';
import type { DirectionsStep } from '../lib/directions';
import { speakGuidance } from '../utils/voice';
import type { NavigationProgress, NavStep, ManeuverKind, RoadSignal } from '../navigation/navModel';
import { phraseForManeuverKind } from '../navigation/spokenManeuver';
import {
  setLastTurnByTurnPhrase,
  isNavigationGuidanceSuppressed,
  setNavigationGuidanceSuppressedUntil,
} from '../navigation/navigationGuidanceMemory';
import {
  distanceClauseForTurnSpeech,
  speechLocaleTag,
  usesMetricForSpeech,
} from '../utils/distanceSpeech';
import { navLogicSdkEnabled } from '../navigation/navFeatureFlags';
import { getVoiceNavTuning } from '../navigation/navModeProfile';
import { getUpcomingManeuverStep } from '../navigation/routeGeometry';
import { alongRouteDistanceMeters, haversineMeters } from '../utils/distance';
import type { Coordinate } from '../types';

type Args = {
  progress: NavigationProgress | null;
  enabled: boolean;
  drivingMode: DrivingMode;
  /** When set, distance + maneuver for speech match turn card / route line (JS nav). */
  routeSteps?: DirectionsStep[] | undefined;
  routePolyline?: Coordinate[] | undefined;
  currentStepIndex?: number;
  userCoord?: { lat: number; lng: number };
  navigationSteps?: NavStep[];
};

function signalClause(signal: RoadSignal): string {
  switch (signal.kind) {
    case 'traffic_light':
      return 'at the traffic light, ';
    case 'stop_sign':
      return 'at the stop sign, ';
    case 'yield':
      return 'at the yield, ';
    case 'railway_crossing':
      return 'at the railway crossing, ';
    case 'toll_booth':
      return 'at the toll booth, ';
    default:
      return '';
  }
}

function roundaboutPhrase(step: NavStep): string {
  const exit = step.roundaboutExitNumber;
  if (!exit) return 'Enter the roundabout';

  const ordinals: Record<number, string> = {
    1: 'first',
    2: 'second',
    3: 'third',
    4: 'fourth',
    5: 'fifth',
    6: 'sixth',
  };
  const ord = ordinals[exit] ?? `${exit}th`;
  const road = step.destinationRoad ?? step.streetName;
  return road
    ? `At the roundabout, take the ${ord} exit onto ${road}`
    : `At the roundabout, take the ${ord} exit`;
}

/** Only chain the *next* maneuver when it is close — avoids "then …" while still on the current leg. */
const CHAIN_NEXT_MAX_M = 240;

function chainPhrase(step: NavStep): string {
  if (!step.nextManeuverKind) return '';
  if (step.nextManeuverDistanceMeters != null && step.nextManeuverDistanceMeters > CHAIN_NEXT_MAX_M) return '';

  const chainable: Partial<Record<ManeuverKind, string>> = {
    turn_left: 'then turn left',
    turn_right: 'then turn right',
    sharp_left: 'then make a sharp left',
    sharp_right: 'then make a sharp right',
    slight_left: 'then bear left',
    slight_right: 'then bear right',
    keep_left: 'then keep left',
    keep_right: 'then keep right',
    uturn: 'then make a U-turn',
    merge_left: 'then merge left',
    merge_right: 'then merge right',
  };

  const phrase = chainable[step.nextManeuverKind];
  if (!phrase) return '';

  const road = step.nextManeuverStreet;
  return road ? `${phrase} onto ${road}` : phrase;
}

function buildUtterance(
  step: NavStep,
  distanceMeters: number,
  bucket: 'preparatory' | 'advance' | 'imminent',
  metric: boolean,
): string | null {
  if (!step || step.kind === 'arrive') return null;

  const d = distanceMeters;
  const distPart = distanceClauseForTurnSpeech(d, metric);

  if (
    step.kind === 'roundabout_left' ||
    step.kind === 'roundabout_right' ||
    step.kind === 'roundabout_straight' ||
    step.kind === 'rotary'
  ) {
    const core = roundaboutPhrase(step);
    const chain = bucket === 'imminent' ? chainPhrase(step) : '';
    const chainSuffix = chain ? `, ${chain}` : '';
    if (bucket === 'imminent') return `${core}${chainSuffix}.`;
    return `${distPart}, ${core.charAt(0).toLowerCase() + core.slice(1)}${chainSuffix}.`;
  }

  const line =
    step.displayInstruction?.trim() ||
    step.instruction?.trim() ||
    phraseForManeuverKind(step.kind);

  const sigClause = bucket === 'advance' ? signalClause(step.signal) : '';
  const chain = bucket === 'imminent' ? chainPhrase(step) : '';
  const chainSuffix = chain ? `, ${chain}` : '';

  let shieldPrefix = '';
  if (bucket !== 'imminent' && step.shields.length > 0) {
    const s = step.shields[0]!;
    shieldPrefix = s.displayRef ? `toward ${s.displayRef}, ` : '';
  }

  if (bucket === 'imminent') {
    return `${sigClause}${line}${chainSuffix}.`;
  }

  return `${distPart}, ${sigClause}${shieldPrefix}${line.charAt(0).toLowerCase() + line.slice(1)}${chainSuffix}.`;
}

/** After a step advances, suppress far/mid-distance cues so the next maneuver is not spoken until the driver settles. */
const VOICE_POST_STEP_SUPPRESS_MS = 3200;

export function useNavigationSpeech({
  progress,
  enabled,
  drivingMode,
  routeSteps,
  routePolyline,
  currentStepIndex,
  userCoord,
  navigationSteps,
}: Args) {
  const lastKey = useRef<string | null>(null);
  const lastStepIndexRef = useRef<number | null>(null);
  const suppressFarVoiceUntilRef = useRef(0);
  const metric = useMemo(() => usesMetricForSpeech(), []);
  const localeTag = useMemo(() => speechLocaleTag(), []);
  const voiceT = useMemo(() => getVoiceNavTuning(drivingMode), [drivingMode]);

  const aligned = useMemo(() => {
    if (!progress?.nextStep) return null;
    const nextIdx = progress.nextStep.index;
    const idx = currentStepIndex ?? 0;
    const nextStepIsCurrentStep = nextIdx <= idx;
    const upcomingDs = routeSteps?.length ? getUpcomingManeuverStep(routeSteps, idx) : null;

    let distanceM = progress.nextStepDistanceMeters;
    let effectiveNavStep = progress.nextStep;

    if (nextStepIsCurrentStep && progress.followingStep) {
      effectiveNavStep = progress.followingStep;
    } else if (nextStepIsCurrentStep && upcomingDs && navigationSteps?.length && routeSteps?.length) {
      const uiIdx = routeSteps.indexOf(upcomingDs);
      if (uiIdx >= 0 && uiIdx < navigationSteps.length) {
        effectiveNavStep = navigationSteps[uiIdx]!;
      }
    }

    if (nextStepIsCurrentStep && upcomingDs && routePolyline && routePolyline.length >= 2 && userCoord) {
      const along = alongRouteDistanceMeters(routePolyline, userCoord, {
        lat: upcomingDs.lat,
        lng: upcomingDs.lng,
      });
      if (Number.isFinite(along) && along >= 0) {
        distanceM = along;
      }
    } else if (nextStepIsCurrentStep && upcomingDs && userCoord) {
      const h = haversineMeters(userCoord.lat, userCoord.lng, upcomingDs.lat, upcomingDs.lng);
      if (Number.isFinite(h)) {
        distanceM = h;
      }
    }

    const step = {
      ...effectiveNavStep,
      distanceMetersToNext: Math.max(0, distanceM),
    };
    return { step, distanceMeters: Math.max(0, distanceM) };
  }, [
    progress,
    routeSteps,
    routePolyline,
    currentStepIndex,
    userCoord?.lat,
    userCoord?.lng,
    navigationSteps,
  ]);

  useEffect(() => {
    if (navLogicSdkEnabled()) return;
    if (!enabled || !progress?.nextStep) return;
    if (progress.nextStep.kind === 'arrive') return;

    const speechStep = aligned?.step ?? progress.nextStep;
    const d = aligned?.distanceMeters ?? progress.nextStepDistanceMeters;

    const stepIdx = speechStep.index;
    const prevIdx = lastStepIndexRef.current;
    if (prevIdx !== stepIdx) {
      if (prevIdx !== null && stepIdx > prevIdx) {
        setNavigationGuidanceSuppressedUntil(0);
        suppressFarVoiceUntilRef.current = Date.now() + VOICE_POST_STEP_SUPPRESS_MS;
        lastKey.current = null;
      }
      lastStepIndexRef.current = stepIdx;
    }

    if (isNavigationGuidanceSuppressed()) return;

    const { imminentM, advanceMaxM, advanceMinM, preparatoryMaxM } = voiceT;

    let bucket: 'preparatory' | 'advance' | 'imminent' | null = null;
    if (d <= imminentM) bucket = 'imminent';
    else if (d <= advanceMaxM && d > advanceMinM) bucket = 'advance';
    else if (d <= preparatoryMaxM && d > advanceMaxM) bucket = 'preparatory';

    if (!bucket) return;

    const now = Date.now();
    if (
      (bucket === 'preparatory' || bucket === 'advance') &&
      now < suppressFarVoiceUntilRef.current
    ) {
      return;
    }

    const key = `${speechStep.index}:${bucket}`;
    if (lastKey.current === key) return;

    const phrase = buildUtterance(speechStep, d, bucket, metric);
    if (!phrase) return;

    setLastTurnByTurnPhrase(phrase);
    speakGuidance(phrase, drivingMode, localeTag);
    lastKey.current = key;
  }, [progress, enabled, drivingMode, metric, localeTag, voiceT, aligned]);

  useEffect(() => {
    if (!enabled) {
      lastKey.current = null;
      lastStepIndexRef.current = null;
      suppressFarVoiceUntilRef.current = 0;
      setLastTurnByTurnPhrase(null);
    }
  }, [enabled]);
}
