import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import type { DrivingMode } from '../types';

let lastSpokenPhrase = '';
let lastSpokenAt = 0;
/** Shorten gap slightly so stacked prompts (reroute + turn) are less likely to drop the second cue. */
const MIN_GAP_MS = 2200;

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

/** Orion and navigation share the same Speech settings. */
const ORION_SPEECH_RATE = 0.96;
const ORION_SPEECH_PITCH = 1.0;

function onUtteranceFinished() {
  void restoreDefaultAudioSession();
}

export function speak(phrase: string, priority: 'high' | 'normal' = 'normal', _mode: DrivingMode = 'adaptive') {
  if (!phrase.trim()) return;
  const normalized = phrase.trim().toLowerCase();
  const now = Date.now();
  if (normalized === lastSpokenPhrase && now - lastSpokenAt < MIN_GAP_MS) return;
  if (now - lastSpokenAt < MIN_GAP_MS && priority !== 'high') return;
  lastSpokenPhrase = normalized;
  lastSpokenAt = now;

  void configureAudioSession();

  if (priority === 'high') Speech.stop();
  Speech.speak(phrase, {
    rate: ORION_SPEECH_RATE,
    pitch: ORION_SPEECH_PITCH,
    language: 'en-US',
    onDone: onUtteranceFinished,
    onStopped: onUtteranceFinished,
    onError: onUtteranceFinished,
  });
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

function buildCalmPhrase(
  core: string,
  dist: number,
  nextTurnDir?: string,
): string {
  const d = naturalDistanceFull(dist);
  let base: string;
  if (dist <= 60) {
    base = `${core} right here.`;
  } else if (dist <= 200) {
    base = `${core.charAt(0).toUpperCase() + core.slice(1)} just ahead.`;
  } else {
    base = `${d.charAt(0).toUpperCase() + d.slice(1)}, please ${core.toLowerCase()}.`;
  }
  if (nextTurnDir && dist <= 400) {
    base = base.replace(/\.$/, `, then ${nextTurnDir}.`);
  }
  return base;
}

function buildAdaptivePhrase(
  core: string,
  dist: number,
  nextTurnDir?: string,
): string {
  const d = naturalDistanceFull(dist);
  let base: string;
  if (dist <= 60) {
    base = `${core}.`;
  } else {
    base = `${d.charAt(0).toUpperCase() + d.slice(1)}, ${core.toLowerCase()}.`;
  }
  if (nextTurnDir && dist <= 300) {
    base = base.replace(/\.$/, `, then ${nextTurnDir}.`);
  }
  return base;
}

function buildSportPhrase(
  core: string,
  dist: number,
  nextTurnDir?: string,
): string {
  const short = naturalDistanceShort(dist);
  let base = dist <= 60 ? `${core}.` : `${short}, ${core.toLowerCase()}.`;
  if (nextTurnDir && dist <= 250) {
    base = base.replace(/\.$/, `, then ${nextTurnDir}.`);
  }
  return base;
}

export interface NextTurnInfo {
  maneuver?: string;
  distanceMeters?: number;
}

/**
 * Build a spoken turn instruction. Pass **live** remaining distance to the maneuver when available.
 */
export function formatTurnInstruction(
  instruction: string,
  distanceMeters?: number,
  maneuver?: string,
  mode: DrivingMode = 'adaptive',
  intersections?: { classes?: string[] }[],
  nextTurn?: NextTurnInfo | null,
): string {
  if (!instruction) return 'Continue';

  const dist = typeof distanceMeters === 'number' && distanceMeters > 0 ? distanceMeters : 400;

  if (maneuver === 'arrive') {
    if (mode === 'calm') return "You've arrived at your destination. Hope you had a peaceful drive.";
    if (mode === 'adaptive') return "You've arrived. Have a great day.";
    if (mode === 'sport') return 'Arrived.';
    return "You have arrived at your destination.";
  }
  if (maneuver === 'depart') {
    if (mode === 'calm') return "You're all set. Enjoy the drive.";
    if (mode === 'adaptive') return 'Starting navigation. Follow the route.';
    if (mode === 'sport') return 'Go.';
    return "Head out and follow the route.";
  }

  const hasLight = intersections?.some((i) => i.classes?.includes('traffic_signal')) ?? false;
  const hasStop = intersections?.some((i) => i.classes?.includes('stop_sign')) ?? false;

  const manL = (maneuver ?? '').toLowerCase();
  /** Prefer structured maneuver (Mapbox modifier) so banner copy like "keep right …" cannot flip L/R vs the step. */
  let dir: string | null = null;
  let sharpTurn = false;
  let slightTurn = false;
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

  const ontoMatch = i.match(/(?:onto|toward|on)\s+(.+)/i);
  const roadName = ontoMatch?.[1]?.replace(/\.$/, '') ?? null;

  let nextTurnDir: string | undefined;
  if (nextTurn && typeof nextTurn.distanceMeters === 'number' && nextTurn.distanceMeters < 300) {
    const nm = nextTurn.maneuver?.toLowerCase() ?? '';
    if (/\bleft\b/.test(nm) && !/\bright\b/.test(nm)) nextTurnDir = 'turn left';
    else if (/\bright\b/.test(nm) && !/\bleft\b/.test(nm)) nextTurnDir = 'turn right';
  }

  let core: string;
  const road = roadName ? ` onto ${roadName}` : '';

  if (dir === 'u-turn') {
    core = 'make a U-turn';
  } else if (dir === 'roundabout') {
    core = 'take the roundabout';
  } else if (dir === 'merge') {
    core = `merge${road}`;
  } else if (dir === 'straight') {
    if (dist < 3000) return '';
    const miles = (dist / 1609.34).toFixed(1);
    if (mode === 'calm') return `Keep going straight for about ${miles} miles.`;
    if (mode === 'sport') return `Straight, ${miles} mi.`;
    return `Continue straight for ${miles} miles.`;
  } else {
    const turnWord = dir === 'left' ? 'left' : 'right';
    if (sharpTurn) {
      core = hasLight
        ? `make a sharp ${turnWord} at the light${road}`
        : hasStop
          ? `make a sharp ${turnWord} at the stop sign${road}`
          : `make a sharp ${turnWord}${road}`;
    } else if (slightTurn) {
      core = hasLight
        ? `bear slightly ${turnWord} at the light${road}`
        : hasStop
          ? `bear slightly ${turnWord} at the stop sign${road}`
          : `bear slightly ${turnWord}${road}`;
    } else if (hasLight) {
      core = `turn ${turnWord} at the light${road}`;
    } else if (hasStop) {
      core = `turn ${turnWord} at the stop sign${road}`;
    } else {
      core = `turn ${turnWord}${road}`;
    }
  }

  if (mode === 'calm') return buildCalmPhrase(core, dist, nextTurnDir);
  if (mode === 'sport') return buildSportPhrase(core, dist, nextTurnDir);
  return buildAdaptivePhrase(core, dist, nextTurnDir);
}
