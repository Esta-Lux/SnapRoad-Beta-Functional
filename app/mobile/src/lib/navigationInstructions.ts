import type { DirectionsStep } from './directions';

/** Prefer Mapbox banner primary text; falls back to step instruction. */
export function primaryInstructionText(step: DirectionsStep | undefined | null): string {
  if (!step) return '';
  const items = step.bannerInstructions;
  if (Array.isArray(items) && items.length > 0) {
    const p = items[0]?.primary;
    const t = typeof p?.text === 'string' ? p.text.trim() : '';
    if (t) return t;
  }
  return (step.instruction || '').trim();
}

/** First Mapbox voice announcement for the step (plain text for expo-speech); strips simple SSML-like tags. */
export function primaryVoiceAnnouncement(step: DirectionsStep | undefined | null): string {
  if (!step) return '';
  const items = step.voiceInstructions;
  if (!Array.isArray(items) || items.length === 0) return '';
  for (const v of items) {
    const raw = typeof v?.announcement === 'string' ? v.announcement.trim() : '';
    if (!raw) continue;
    const plain = raw.replace(/<[^>]+>/g, '').trim();
    if (plain) return plain;
  }
  return '';
}
