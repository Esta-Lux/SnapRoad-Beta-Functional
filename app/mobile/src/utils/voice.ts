import * as Speech from 'expo-speech';
import type { DrivingMode } from '../types';

let lastSpokenPhrase = '';
let lastSpokenAt = 0;
const MIN_GAP_MS = 8000;

const SPEECH_RATES: Record<DrivingMode, number> = {
  calm: 1.0,
  adaptive: 1.05,
  sport: 1.2,
};

export function speak(phrase: string, priority: 'high' | 'normal' = 'normal', mode: DrivingMode = 'adaptive') {
  if (!phrase.trim()) return;
  const normalized = phrase.trim().toLowerCase();
  const now = Date.now();
  if (normalized === lastSpokenPhrase && now - lastSpokenAt < MIN_GAP_MS) return;
  if (now - lastSpokenAt < MIN_GAP_MS && priority !== 'high') return;
  lastSpokenPhrase = normalized;
  lastSpokenAt = now;

  if (priority === 'high') Speech.stop();
  Speech.speak(phrase, { rate: SPEECH_RATES[mode] ?? 1.05, pitch: 1.0, language: 'en-US' });
}

export function stopSpeaking() {
  Speech.stop();
}

export function formatTurnInstruction(
  instruction: string,
  distanceMeters?: number,
  maneuver?: string,
): string {
  if (!instruction) return 'Continue';
  const i = instruction.trim();
  const dist = typeof distanceMeters === 'number' && distanceMeters > 0 ? distanceMeters : 400;

  const directionMatch = i.match(/\b(left|right|u-turn|straight)\b/i);
  const turnDirection = directionMatch ? directionMatch[1].toLowerCase() : null;

  const ontoMatch = i.match(/(?:onto|toward|on)\s+(.+)/i);
  const streetName = ontoMatch ? ontoMatch[1].replace(/\.$/, '') : null;

  let turnPhrase = '';
  if (maneuver === 'arrive') return `You have arrived at your destination.`;
  if (maneuver === 'depart') return `Head out and follow the route.`;

  if (turnDirection === 'u-turn') turnPhrase = 'Make a U-turn';
  else if (turnDirection === 'left') turnPhrase = 'Turn left';
  else if (turnDirection === 'right') turnPhrase = 'Turn right';
  else if (turnDirection === 'straight') turnPhrase = 'Continue straight';
  else if (maneuver?.includes('left')) turnPhrase = `Turn ${maneuver.replace('-', ' ')}`;
  else if (maneuver?.includes('right')) turnPhrase = `Turn ${maneuver.replace('-', ' ')}`;
  else if (maneuver === 'roundabout') turnPhrase = 'Take the roundabout';
  else if (maneuver === 'merge') turnPhrase = 'Merge';

  const streetSuffix = streetName ? ` onto ${streetName}` : '';

  if (!turnPhrase) return i;

  if (dist > 800) {
    const miles = (dist / 1609.34).toFixed(1);
    return `In ${miles} miles, ${turnPhrase.toLowerCase()}${streetSuffix}.`;
  }
  if (dist > 150) {
    const feet = Math.round(dist * 3.281 / 50) * 50;
    return `In ${feet} feet, ${turnPhrase.toLowerCase()}${streetSuffix}.`;
  }
  return `${turnPhrase}${streetSuffix}.`;
}
