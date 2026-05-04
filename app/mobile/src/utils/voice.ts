import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import type { DrivingMode } from '../types';
import { shouldSuppressJsTurnGuidance } from '../navigation/navVoiceGate';
import { isSdkTripAuthoritative } from '../navigation/navSdkAuthority';
import { markNavVoiceFromJs, msSinceLastSdkVoice } from '../navigation/navSdkStore';
import type { LaneInfo, ManeuverKind, RoadSignal } from '../navigation/navModel';
import { navLaneGuidanceUiEnabled } from '../navigation/navFeatureFlags';
import { getPreferredTtsVoiceIdentifier } from './ttsVoicePreference';
import { DRIVING_MODES } from '../constants/modes';

let lastSpokenPhrase = '';
let lastSpokenAt = 0;
/** Shorten gap slightly so stacked prompts (reroute + turn) are less likely to drop the second cue. */
const MIN_GAP_MS = 2200;
/** Min interval between **different** turn-by-turn cues (normal `speak()` would block these at MIN_GAP_MS). */
const GUIDANCE_MIN_MS = 1400;

/**
 * Session before TTS: iOS uses non-mixing so navigation cues behave like other nav apps (music yields).
 * Pair with {@link restoreDefaultAudioSession} in Speech callbacks when an utterance finishes.
 */
export async function configureAudioSession(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  } catch {
    /* native module missing or session busy */
  }
}

/**
 * Turn-by-turn / Orion on the **phone speaker**: `DoNotMix` can route poorly vs CarPlay.
 * DuckOthers keeps output on the main route and plays in silent mode.
 */
export async function configureAudioSessionForSpeechOutput(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  } catch {
    /* ignore */
  }
}

/** Relax session after Orion / turn-by-turn finishes so media can resume normally. */
export async function restoreDefaultAudioSession(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Orion voice-input: allow the mic while avoiding fighting navigation TTS session.
 * Call before `Voice.start()`; after dictation stops or before nav `speak()`, use playback or restore.
 */
export async function configureAudioSessionForVoiceInput(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  } catch {
    /* ignore */
  }
}

export type TtsSpeechProfile = {
  rate: number;
  pitch: number;
  language: 'en-US';
};

/**
 * One house voice for navigation + Orion: calm, clear, young-adult male when
 * the device exposes a matching voice. Expo treats `rate: 1.0` as normal speed;
 * keep mode differences subtle so turn cues stay easy to parse in a car.
 */
const MODE_SPEECH_PROFILE: Record<DrivingMode, TtsSpeechProfile> = {
  calm: {
    rate: DRIVING_MODES.calm.speechRate,
    pitch: DRIVING_MODES.calm.speechPitch,
    language: 'en-US',
  },
  adaptive: {
    rate: DRIVING_MODES.adaptive.speechRate,
    pitch: DRIVING_MODES.adaptive.speechPitch,
    language: 'en-US',
  },
  sport: {
    rate: DRIVING_MODES.sport.speechRate,
    pitch: DRIVING_MODES.sport.speechPitch,
    language: 'en-US',
  },
};

export type SpeakRateSource = 'driving' | 'navigation_fixed' | 'advisory';

export type SpeakOptions = {
  /**
   * `driving` — same male voice rate as Orion so active HUD output stays consistent.
   * `navigation_fixed` — normal nav rate (not tied to driving mode). Blocked during an
   *    SDK-authoritative trip (native TTS owns turn cues).
   * `advisory` — navigation-time extras (offer nearby, incident ahead). During an
   *    SDK-authoritative trip, these are suppressed for ~3s after a native voice line
   *    to avoid stepping on a turn cue, but otherwise play at the driving-mode rate so
   *    the user still hears useful non-turn prompts.
   */
  rateSource?: SpeakRateSource;
  /**
   * User-initiated speech that must bypass the `isSdkTripAuthoritative` guard
   * (e.g. long-press "repeat last instruction"). Does NOT bypass mute / debounce.
   */
  forceAllowDuringSdk?: boolean;
};

/** After a native voice line, suppress `advisory` JS speech for this many ms. */
const ADVISORY_SDK_HOLDOFF_MS = 3000;

// Dev-only counters so regressions surface in the HUD / logs.
let advisorySuppressedCount = 0;
let advisorySpokenCount = 0;
let navigationFixedBlockedCount = 0;
export function getVoiceDevCounters(): {
  advisorySuppressed: number;
  advisorySpoken: number;
  navigationFixedBlocked: number;
} {
  return {
    advisorySuppressed: advisorySuppressedCount,
    advisorySpoken: advisorySpokenCount,
    navigationFixedBlocked: navigationFixedBlockedCount,
  };
}
export function resetVoiceDevCounters(): void {
  advisorySuppressedCount = 0;
  advisorySpokenCount = 0;
  navigationFixedBlockedCount = 0;
}

export function getTtsSpeechProfile(mode: DrivingMode = 'adaptive'): TtsSpeechProfile {
  return MODE_SPEECH_PROFILE[mode] ?? MODE_SPEECH_PROFILE.adaptive;
}

function onUtteranceFinished() {
  void restoreDefaultAudioSession();
}

export function speak(
  phrase: string,
  priority: 'high' | 'normal' = 'normal',
  mode: DrivingMode = 'adaptive',
  opts?: SpeakOptions,
) {
  if (!phrase.trim()) return;
  const rateSource = opts?.rateSource ?? 'driving';
  const forceAllow = opts?.forceAllowDuringSdk === true;
  const sdkOwns = isSdkTripAuthoritative();

  if (rateSource === 'navigation_fixed' && sdkOwns && !forceAllow) {
    navigationFixedBlockedCount++;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Nav] blocked JS Speech.speak(navigation) during SDK-authoritative trip', phrase.slice(0, 72));
    }
    return;
  }
  // Advisory line (offer, incident) during an active native trip — hold off briefly after a
  // native voice cue, otherwise the user hears two overlapping prompts on the car speakers.
  if (rateSource === 'advisory' && sdkOwns && !forceAllow) {
    if (msSinceLastSdkVoice() < ADVISORY_SDK_HOLDOFF_MS) {
      advisorySuppressedCount++;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[Nav] deferred JS advisory speech — native SDK spoke',
          Math.round(msSinceLastSdkVoice()),
          'ms ago:',
          phrase.slice(0, 64),
        );
      }
      return;
    }
    advisorySpokenCount++;
  }

  const normalized = phrase.trim().toLowerCase();
  const now = Date.now();
  if (normalized === lastSpokenPhrase && now - lastSpokenAt < MIN_GAP_MS) return;
  if (now - lastSpokenAt < MIN_GAP_MS && priority !== 'high') return;
  lastSpokenPhrase = normalized;
  lastSpokenAt = now;

  if (priority === 'high') Speech.stop();

  const profile = getTtsSpeechProfile(mode);
  if (rateSource === 'navigation_fixed') {
    markNavVoiceFromJs();
  }

  void (async () => {
    await configureAudioSessionForSpeechOutput();
    const voiceId = await getPreferredTtsVoiceIdentifier();
    Speech.speak(phrase, {
      rate: profile.rate,
      pitch: profile.pitch,
      language: profile.language,
      ...(voiceId ? { voice: voiceId } : {}),
      onDone: onUtteranceFinished,
      onStopped: onUtteranceFinished,
      onError: onUtteranceFinished,
    });
  })();
}

/**
 * Turn-by-turn distance cues: same audio session as {@link speak}, but allows successive **different**
 * phrases sooner than `MIN_GAP_MS` (still debounces identical phrase repeats).
 */
export function speakGuidance(
  phrase: string,
  mode: DrivingMode = 'adaptive',
  language: string = 'en-US',
) {
  if (shouldSuppressJsTurnGuidance()) return;
  if (isSdkTripAuthoritative()) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const v = process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG;
      if (v === '1' || v === 'true') {
        // eslint-disable-next-line no-console
        console.error('[Nav] speakGuidance invoked during SDK-authoritative trip (should be native TTS only)', phrase.slice(0, 80));
      }
    }
    return;
  }
  if (!phrase.trim()) return;
  const normalized = phrase.trim().toLowerCase();
  const now = Date.now();
  if (normalized === lastSpokenPhrase && now - lastSpokenAt < MIN_GAP_MS) return;
  if (normalized !== lastSpokenPhrase && now - lastSpokenAt < GUIDANCE_MIN_MS) return;
  lastSpokenPhrase = normalized;
  lastSpokenAt = now;

  markNavVoiceFromJs();

  void (async () => {
    Speech.stop();
    await configureAudioSessionForSpeechOutput();
    const voiceId = await getPreferredTtsVoiceIdentifier();
    const profile = getTtsSpeechProfile(mode);
    Speech.speak(phrase, {
      rate: profile.rate,
      pitch: profile.pitch,
      language: language || profile.language,
      ...(voiceId ? { voice: voiceId } : {}),
      onDone: onUtteranceFinished,
      onStopped: onUtteranceFinished,
      onError: onUtteranceFinished,
    });
  })();
}

/**
 * Orion assistant replies: same male-voice preference as nav; uses {@link configureAudioSession}
 * (CarPlay-friendly mixing) like the previous Orion inline `Speech.speak`.
 */
export function speakOrionReply(text: string, onFinish?: () => void, mode: DrivingMode = 'adaptive') {
  if (!text.trim()) {
    onFinish?.();
    return;
  }
  void (async () => {
    try {
      Speech.stop();
      await configureAudioSessionForSpeechOutput();
      const voiceId = await getPreferredTtsVoiceIdentifier();
      const profile = getTtsSpeechProfile(mode);
      Speech.speak(text.trim(), {
        rate: profile.rate,
        pitch: profile.pitch,
        language: profile.language,
        ...(voiceId ? { voice: voiceId } : {}),
        onDone: onFinish,
        onStopped: onFinish,
        onError: onFinish,
      });
    } catch {
      onFinish?.();
    }
  })();
}

export function stopSpeaking() {
  Speech.stop();
  void restoreDefaultAudioSession();
}

function naturalDistanceFull(meters: number): string {
  const feet = meters * 3.281;
  if (feet < 100) return 'right here';
  if (feet < 250) return 'in about 200 feet';
  if (feet < 600) return 'in about 500 feet';
  const miles = meters / 1609.34;
  if (miles < 0.22) return 'in about a quarter mile';
  if (miles < 0.65) return 'in about half a mile';
  if (miles < 1.3) return 'in about a mile';
  return `in about ${miles.toFixed(1)} miles`;
}

function naturalDistanceShort(meters: number): string {
  const feet = meters * 3.281;
  if (feet < 100) return 'now';
  if (feet < 300) return `${Math.round(feet / 50) * 50} ft`;
  if (feet < 600) return '500 ft';
  const miles = meters / 1609.34;
  if (miles < 0.22) return '¼ mi';
  if (miles < 0.65) return '½ mi';
  if (miles < 1.3) return '1 mi';
  return `${miles.toFixed(1)} mi`;
}

function buildCalmPhrase(core: string, dist: number, chain: string, laneSuffix: string): string {
  const d = naturalDistanceFull(dist);
  let base: string;
  if (dist <= 60) base = `${core} right here.`;
  else if (dist <= 200) base = `${core.charAt(0).toUpperCase() + core.slice(1)} just ahead.`;
  else base = `${d.charAt(0).toUpperCase() + d.slice(1)}, please ${core.toLowerCase()}.`;
  return base.replace(/\.$/, `${chain}.`) + laneSuffix;
}

function buildAdaptivePhrase(core: string, dist: number, chain: string, laneSuffix: string): string {
  const d = naturalDistanceFull(dist);
  let base: string;
  if (dist <= 60) base = `${core}.`;
  else base = `${d.charAt(0).toUpperCase() + d.slice(1)}, ${core.toLowerCase()}.`;
  return base.replace(/\.$/, `${chain}.`) + laneSuffix;
}

function buildSportPhrase(core: string, dist: number, chain: string, laneSuffix: string): string {
  const short = naturalDistanceShort(dist);
  let base = dist <= 60 ? `${core}.` : `${short}, ${core.toLowerCase()}.`;
  return base.replace(/\.$/, `${chain}.`) + laneSuffix;
}

function signalPrefix(signal?: RoadSignal): string {
  if (!signal || signal.kind === 'none') return '';
  switch (signal.kind) {
    case 'traffic_light':
      return 'at the light, ';
    case 'stop_sign':
      return 'at the stop sign, ';
    case 'yield':
      return 'at the yield, ';
    case 'toll_booth':
      return 'at the toll, ';
    case 'railway_crossing':
      return 'at the crossing, ';
    default:
      return '';
  }
}

function laneAdvice(lanes?: LaneInfo[]): string {
  if (!navLaneGuidanceUiEnabled()) return '';
  if (!lanes?.length) return '';
  const active = lanes.filter((l) => l.active);
  if (!active.length || active.length === lanes.length) return '';
  const pos = lanes.indexOf(active[0]!);
  const total = lanes.length;
  if (active.length === 1) {
    if (pos === 0) return ' Stay in the left lane.';
    if (pos === total - 1) return ' Stay in the right lane.';
    return '';
  }
  if (pos === 0) return ' Use the left lanes.';
  if (pos + active.length >= total) return ' Use the right lanes.';
  return '';
}

function chainHint(nextKind?: ManeuverKind | null, nextDist?: number | null): string {
  if (!nextKind) return '';
  if (nextDist != null && nextDist > 300) return '';
  const dirMap: Partial<Record<ManeuverKind, string>> = {
    turn_left: 'turn left',
    turn_right: 'turn right',
    sharp_left: 'sharp left',
    sharp_right: 'sharp right',
    slight_left: 'bear left',
    slight_right: 'bear right',
    keep_left: 'keep left',
    keep_right: 'keep right',
    uturn: 'make a U-turn',
  };
  const chain = dirMap[nextKind];
  if (!chain) return '';
  return `, then ${chain}`;
}

export interface NextTurnInfo {
  maneuver?: string;
  distanceMeters?: number;
}

export type NavStepSpeechData = {
  signal?: RoadSignal;
  lanes?: LaneInfo[];
  roundaboutExitNumber?: number | null;
  destinationRoad?: string | null;
  shields?: { displayRef: string }[];
  nextManeuverKind?: ManeuverKind | null;
  nextManeuverStreet?: string | null;
  nextManeuverDistanceMeters?: number | null;
  kind?: ManeuverKind;
};

/**
 * Build a spoken turn instruction from NavStep-level fields when available.
 */
export function formatTurnInstruction(
  instruction: string,
  distanceMeters?: number,
  maneuver?: string,
  mode: DrivingMode = 'adaptive',
  intersections?: { classes?: string[] }[],
  nextTurn?: NextTurnInfo | null,
  navStepData?: NavStepSpeechData,
): string {
  if (!instruction) return 'Continue';

  const dist = typeof distanceMeters === 'number' && distanceMeters > 0 ? distanceMeters : 400;
  const signal = navStepData?.signal;
  const lanes = navStepData?.lanes;
  const kind = navStepData?.kind;

  if (maneuver === 'arrive' || kind === 'arrive') {
    if (mode === 'calm') return "You've arrived at your destination. Hope you had a peaceful drive.";
    if (mode === 'adaptive') return "You've arrived. Have a great day.";
    if (mode === 'sport') return 'Arrived.';
    return "You have arrived at your destination.";
  }
  if (maneuver === 'depart' || kind === 'depart') {
    if (mode === 'calm') return "You're all set. Enjoy the drive.";
    if (mode === 'adaptive') return 'Starting navigation. Follow the route.';
    if (mode === 'sport') return 'Go.';
    return 'Head out and follow the route.';
  }

  if (
    kind === 'roundabout_left' ||
    kind === 'roundabout_right' ||
    kind === 'roundabout_straight' ||
    kind === 'rotary'
  ) {
    const exit = navStepData?.roundaboutExitNumber;
    const ordinals: Record<number, string> = {
      1: 'first',
      2: 'second',
      3: 'third',
      4: 'fourth',
      5: 'fifth',
      6: 'sixth',
    };
    if (exit) {
      const ord = ordinals[exit] ?? `${exit}th`;
      const exitPhrase = `at the roundabout, take the ${ord} exit`;
      const chain = chainHint(
        navStepData?.nextManeuverKind,
        navStepData?.nextManeuverDistanceMeters,
      );
      if (mode === 'calm') return buildCalmPhrase(exitPhrase, dist, chain, laneAdvice(lanes));
      if (mode === 'sport') return buildSportPhrase(exitPhrase, dist, chain, laneAdvice(lanes));
      return buildAdaptivePhrase(exitPhrase, dist, chain, laneAdvice(lanes));
    }
  }

  const manL = (maneuver ?? '').toLowerCase();
  let dir: string | null = null;
  let sharpTurn = false;
  let slightTurn = false;

  if (kind) {
    const kindDirMap: Partial<
      Record<ManeuverKind, { dir: string; sharp?: boolean; slight?: boolean }>
    > = {
      turn_left: { dir: 'left' },
      turn_right: { dir: 'right' },
      sharp_left: { dir: 'left', sharp: true },
      sharp_right: { dir: 'right', sharp: true },
      slight_left: { dir: 'left', slight: true },
      slight_right: { dir: 'right', slight: true },
      uturn: { dir: 'u-turn' },
      merge_left: { dir: 'merge' },
      merge_right: { dir: 'merge' },
      merge: { dir: 'merge' },
      straight: { dir: 'straight' },
      keep_left: { dir: 'left', slight: true },
      keep_right: { dir: 'right', slight: true },
      fork_left: { dir: 'left' },
      fork_right: { dir: 'right' },
      on_ramp_left: { dir: 'left' },
      on_ramp_right: { dir: 'right' },
      off_ramp_left: { dir: 'left' },
      off_ramp_right: { dir: 'right' },
    };
    const mapped = kindDirMap[kind];
    if (mapped) {
      dir = mapped.dir;
      sharpTurn = mapped.sharp ?? false;
      slightTurn = mapped.slight ?? false;
    }
  }

  if (!dir) {
    if (manL === 'u-turn' || manL.includes('u-turn')) dir = 'u-turn';
    else if (manL.includes('roundabout')) dir = 'roundabout';
    else if (manL.includes('merge')) dir = 'merge';
    else if (manL === 'straight') dir = 'straight';
    else if (manL.includes('sharp') && manL.includes('left')) {
      dir = 'left';
      sharpTurn = true;
    } else if (manL.includes('sharp') && manL.includes('right')) {
      dir = 'right';
      sharpTurn = true;
    } else if (manL.includes('slight') && manL.includes('left')) {
      dir = 'left';
      slightTurn = true;
    } else if (manL.includes('slight') && manL.includes('right')) {
      dir = 'right';
      slightTurn = true;
    } else if (/\bleft\b/.test(manL)) dir = 'left';
    else if (/\bright\b/.test(manL)) dir = 'right';
  }

  const i = instruction.trim();
  if (!dir) {
    const dirMatch = i.match(/\b(left|right|u-turn|straight)\b/i);
    const turnDir = dirMatch?.[1]?.toLowerCase() ?? null;
    if (turnDir === 'u-turn') dir = 'u-turn';
    else if (turnDir === 'left') dir = 'left';
    else if (turnDir === 'right') dir = 'right';
    else if (turnDir === 'straight') dir = 'straight';
  }

  if (!dir) return i;

  const sigPre = signalPrefix(signal);
  const legacyHasLight = !signal && (intersections?.some((ix) => ix.classes?.includes('traffic_signal')) ?? false);
  const legacyHasStop = !signal && (intersections?.some((ix) => ix.classes?.includes('stop_sign')) ?? false);
  const useLegacySignal = !signal || signal.kind === 'none';

  const chain =
    chainHint(
      navStepData?.nextManeuverKind,
      navStepData?.nextManeuverDistanceMeters,
    ) ||
    (() => {
      if (nextTurn && typeof nextTurn.distanceMeters === 'number' && nextTurn.distanceMeters < 300) {
        const nm = nextTurn.maneuver?.toLowerCase() ?? '';
        if (/\bleft\b/.test(nm) && !/\bright\b/.test(nm)) return ', then turn left';
        if (/\bright\b/.test(nm) && !/\bleft\b/.test(nm)) return ', then turn right';
      }
      return '';
    })();

  const laneSuffix = laneAdvice(lanes);

  let core: string;

  if (dir === 'u-turn') {
    core = `${sigPre}make a U-turn`;
  } else if (dir === 'roundabout') {
    core = `${sigPre}take the roundabout`;
  } else if (dir === 'merge') {
    core = `${sigPre}merge`;
  } else if (dir === 'straight') {
    if (dist < 3000) return '';
    const miles = (dist / 1609.34).toFixed(1);
    if (mode === 'calm') return `Keep going straight for about ${miles} miles.`;
    if (mode === 'sport') return `Straight, ${miles} mi.`;
    return `Continue straight for ${miles} miles.`;
  } else {
    const turnWord = dir === 'left' ? 'left' : 'right';
    const signalLabel =
      sigPre ||
      (useLegacySignal && legacyHasLight ? 'at the light, ' : '') ||
      (useLegacySignal && legacyHasStop ? 'at the stop sign, ' : '');

    if (sharpTurn) {
      core = `${signalLabel}make a sharp ${turnWord}`;
    } else if (slightTurn) {
      core = `${signalLabel}bear slightly ${turnWord}`;
    } else {
      core = `${signalLabel}turn ${turnWord}`;
    }
  }

  if (mode === 'calm') return buildCalmPhrase(core, dist, chain, laneSuffix);
  if (mode === 'sport') return buildSportPhrase(core, dist, chain, laneSuffix);
  return buildAdaptivePhrase(core, dist, chain, laneSuffix);
}
