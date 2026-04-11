/**
 * Heuristic units for TTS and opening distance clauses for turn-by-turn.
 */

export function usesMetricForSpeech(): boolean {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    const tag = loc.toLowerCase();
    if (tag.includes('-us') || tag.endsWith('us')) return false;
    const region = (loc.split(/[-_]/)[1] ?? '').toUpperCase();
    if (region === 'US' || region === 'LR' || region === 'MM' || region === 'GB' || region === 'UK') {
      return false;
    }
    if (region && /^[A-Z]{2}$/.test(region)) return true;
    return !tag.startsWith('en');
  } catch {
    return false;
  }
}

export function speechLocaleTag(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

/** Opening distance clause for turn-by-turn ("In …"). Rounds to natural intervals. */
export function distanceClauseForTurnSpeech(meters: number, metric: boolean): string {
  if (meters <= 12) return 'Now';

  if (!metric) {
    const feet = Math.round(meters * 3.28084);
    if (feet <= 50) return 'Now';
    if (feet < 150) return 'In about 100 feet';
    if (feet < 250) return 'In about 200 feet';
    if (feet < 400) return 'In about 300 feet';
    if (feet < 700) return 'In about 500 feet';
    if (feet < 1100) return 'In about a quarter mile';
    if (feet < 2000) return 'In about a quarter mile';
    const miles = meters / 1609.34;
    if (miles < 0.65) return 'In about half a mile';
    if (miles < 0.85) return 'In about three quarters of a mile';
    if (miles < 1.3) return 'In about one mile';
    if (miles < 1.8) return 'In about a mile and a half';
    return `In about ${Math.round(miles)} miles`;
  }

  if (meters <= 30) return 'Now';
  if (meters < 80) return 'In about 50 meters';
  if (meters < 150) return 'In about 100 meters';
  if (meters < 250) return 'In about 200 meters';
  if (meters < 400) return 'In about 300 meters';
  if (meters < 600) return 'In about 500 meters';
  if (meters < 850) return 'In about 700 meters';
  const km = meters / 1000;
  if (km < 1.3) return 'In about one kilometer';
  if (km < 1.8) return 'In about one and a half kilometers';
  if (km < 2.5) return 'In about two kilometers';
  return `In about ${Math.round(km)} kilometers`;
}
