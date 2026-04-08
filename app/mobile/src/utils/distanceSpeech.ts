/**
 * Heuristic units for TTS (no native localization dependency).
 * US / Liberia / Myanmar → imperial; UK defaults imperial for road-style cues.
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

/** Opening distance clause for turn-by-turn ("In …"). */
export function distanceClauseForTurnSpeech(meters: number, metric: boolean): string {
  if (!metric) {
    const feet = Math.round(meters * 3.28084);
    if (feet >= 1000) return `In ${Math.round(feet / 5280)} miles`;
    return `In ${feet} feet`;
  }
  if (meters <= 18) return 'In a moment';
  if (meters < 950) {
    const m = Math.max(20, Math.round(meters / 20) * 20);
    return `In ${m} meters`;
  }
  const km = meters / 1000;
  if (km < 1.45) return 'In about one kilometer';
  return `In about ${km.toFixed(1)} kilometers`;
}
