import * as Speech from 'expo-speech';
import type { DrivingMode } from '../types';
import { DRIVING_MODES } from '../constants/modes';

let lastSpokenPhrase = '';
let lastSpokenAt = 0;
const MIN_GAP_MS = 3000;

/**
 * Reserved for future native audio session config. Avoid static `expo-audio` import:
 * it crashes on binaries built without that native module.
 */
export async function configureAudioSession(): Promise<void> {
  /* no-op */
}

export function speak(phrase: string, priority: 'high' | 'normal' = 'normal', mode: DrivingMode = 'adaptive') {
  if (!phrase.trim()) return;
  const normalized = phrase.trim().toLowerCase();
  const now = Date.now();
  if (normalized === lastSpokenPhrase && now - lastSpokenAt < MIN_GAP_MS) return;
  if (now - lastSpokenAt < MIN_GAP_MS && priority !== 'high') return;
  lastSpokenPhrase = normalized;
  lastSpokenAt = now;

  const cfg = DRIVING_MODES[mode];
  if (priority === 'high') Speech.stop();
  Speech.speak(phrase, {
    rate: cfg?.speechRate ?? 1.05,
    pitch: cfg?.speechPitch ?? 1.0,
    language: 'en-US',
  });
}

export function stopSpeaking() {
  Speech.stop();
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
    return 'Head out and follow the route.';
  }

  const hasLight = intersections?.some((i) => i.classes?.includes('traffic_signal')) ?? false;
  const hasStop = intersections?.some((i) => i.classes?.includes('stop_sign')) ?? false;

  const i = instruction.trim();
  const dirMatch = i.match(/\b(left|right|u-turn|straight)\b/i);
  const turnDir = dirMatch?.[1]?.toLowerCase() ?? null;

  const manL = maneuver?.toLowerCase() ?? '';
  let dir: string | null = null;
  if (turnDir === 'u-turn') dir = 'u-turn';
  else if (turnDir === 'left' || manL.includes('left')) dir = 'left';
  else if (turnDir === 'right' || manL.includes('right')) dir = 'right';
  else if (turnDir === 'straight' || manL === 'straight') dir = 'straight';
  else if (manL === 'roundabout') dir = 'roundabout';
  else if (manL === 'merge') dir = 'merge';

  if (!dir) return i;

  const ontoMatch = i.match(/(?:onto|toward|on)\s+(.+)/i);
  const roadName = ontoMatch?.[1]?.replace(/\.$/, '') ?? null;

  let nextTurnDir: string | undefined;
  if (nextTurn && typeof nextTurn.distanceMeters === 'number' && nextTurn.distanceMeters < 300) {
    const nm = nextTurn.maneuver?.toLowerCase() ?? '';
    if (nm.includes('left')) nextTurnDir = 'turn left';
    else if (nm.includes('right')) nextTurnDir = 'turn right';
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
    if (hasLight) {
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
