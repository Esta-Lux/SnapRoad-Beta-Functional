import type { DrivingMode } from '../../types';
import { speak, speakGuidance } from '../../utils/voice';

export type OrionVoiceMode = 'nav' | 'personality';

export function speakNavigationVoice(text: string, drivingMode: DrivingMode): void {
  speakGuidance(text, drivingMode, 'en-US');
}

export function speakOrionPersonalityLine(text: string, drivingMode: DrivingMode): void {
  speak(text, 'normal', drivingMode, {
    rateSource: 'advisory',
    forceAllowDuringSdk: false,
  });
}
