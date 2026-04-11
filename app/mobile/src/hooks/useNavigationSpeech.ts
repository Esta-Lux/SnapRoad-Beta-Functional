import { useEffect, useMemo, useRef } from 'react';
import type { DrivingMode } from '../types';
import { speakGuidance } from '../utils/voice';
import type { NavigationProgress, NavStep, ManeuverKind, RoadSignal, LaneInfo } from '../navigation/navModel';
import { phraseForManeuverKind } from '../navigation/spokenManeuver';
import {
  setLastTurnByTurnPhrase,
  isNavigationGuidanceSuppressed,
} from '../navigation/navigationGuidanceMemory';
import {
  distanceClauseForTurnSpeech,
  speechLocaleTag,
  usesMetricForSpeech,
} from '../utils/distanceSpeech';
import { navLogicSdkEnabled } from '../navigation/navFeatureFlags';
import { getVoiceNavTuning } from '../navigation/navModeProfile';

type Args = {
  progress: NavigationProgress | null;
  enabled: boolean;
  drivingMode: DrivingMode;
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

function laneHint(lanes: LaneInfo[]): string {
  if (!lanes.length) return '';
  const active = lanes.filter((l) => l.active);
  if (!active.length) return '';

  const positions = active.map((lane) => lanes.indexOf(lane));
  const total = lanes.length;
  if (total <= 1) return '';

  const leftmost = Math.min(...positions);
  const rightmost = Math.max(...positions);

  if (active.length === 1) {
    if (leftmost === 0) return ' Use the left lane.';
    if (leftmost === total - 1) return ' Use the right lane.';
    if (total <= 3 && leftmost === 1) return ' Use the middle lane.';
    return ` Use lane ${leftmost + 1} from the left.`;
  }

  if (leftmost === 0 && rightmost < total - 1) return ' Use the left lanes.';
  if (rightmost === total - 1 && leftmost > 0) return ' Use the right lanes.';
  return '';
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

/** Only chain the *next* maneuver when it is close — avoids “then …” while the driver is still in the current leg. */
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
  progress: NavigationProgress,
  bucket: 'preparatory' | 'advance' | 'imminent',
  metric: boolean,
): string | null {
  const step = progress.nextStep;
  if (!step || step.kind === 'arrive') return null;

  const d = progress.nextStepDistanceMeters;
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
  const laneSuffix = bucket === 'imminent' ? laneHint(step.lanes) : '';
  const chain = bucket === 'imminent' ? chainPhrase(step) : '';
  const chainSuffix = chain ? `, ${chain}` : '';

  let shieldPrefix = '';
  if (bucket !== 'imminent' && step.shields.length > 0) {
    const s = step.shields[0]!;
    shieldPrefix = s.displayRef ? `toward ${s.displayRef}, ` : '';
  }

  if (bucket === 'imminent') {
    return `${sigClause}${line}${chainSuffix}.${laneSuffix}`;
  }

  return `${distPart}, ${sigClause}${shieldPrefix}${line.charAt(0).toLowerCase() + line.slice(1)}${chainSuffix}.${laneSuffix}`;
}

/** After a step advances, suppress far/mid-distance cues so the next maneuver is not spoken until the driver settles. */
const VOICE_POST_STEP_SUPPRESS_MS = 2800;

export function useNavigationSpeech({ progress, enabled, drivingMode }: Args) {
  const lastKey = useRef<string | null>(null);
  const lastStepIndexRef = useRef<number | null>(null);
  const suppressFarVoiceUntilRef = useRef(0);
  const metric = useMemo(() => usesMetricForSpeech(), []);
  const localeTag = useMemo(() => speechLocaleTag(), []);
  const voiceT = useMemo(() => getVoiceNavTuning(drivingMode), [drivingMode]);

  useEffect(() => {
    if (navLogicSdkEnabled()) return;
    if (!enabled || !progress?.nextStep) return;
    if (progress.nextStep.kind === 'arrive') return;
    if (isNavigationGuidanceSuppressed()) return;

    const stepIdx = progress.nextStep.index;
    const prevIdx = lastStepIndexRef.current;
    if (prevIdx !== stepIdx) {
      if (prevIdx !== null && stepIdx > prevIdx) {
        suppressFarVoiceUntilRef.current = Date.now() + VOICE_POST_STEP_SUPPRESS_MS;
        lastKey.current = null;
      }
      lastStepIndexRef.current = stepIdx;
    }

    const d = progress.nextStepDistanceMeters;
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

    const key = `${progress.nextStep.index}:${bucket}`;
    if (lastKey.current === key) return;

    let phrase: string | null = null;
    if (bucket === 'preparatory' && progress.nextStep.voiceAnnouncement) {
      phrase = progress.nextStep.voiceAnnouncement;
    }
    if (!phrase) {
      phrase = buildUtterance(progress, bucket, metric);
    }
    if (!phrase) return;

    setLastTurnByTurnPhrase(phrase);
    speakGuidance(phrase, drivingMode, localeTag);
    lastKey.current = key;
  }, [progress, enabled, drivingMode, metric, localeTag, voiceT]);

  useEffect(() => {
    if (!enabled) {
      lastKey.current = null;
      lastStepIndexRef.current = null;
      suppressFarVoiceUntilRef.current = 0;
      setLastTurnByTurnPhrase(null);
    }
  }, [enabled]);
}
