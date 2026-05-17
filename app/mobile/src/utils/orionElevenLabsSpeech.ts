import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import api from '../api/client';

export type OrionVoiceChannel = 'orion' | 'navigation' | 'advisory';

type OrionVoiceResponse = {
  success?: boolean;
  audio_base64?: string;
  mime_type?: string;
  provider?: string;
  error?: string;
};

type ElevenLabsSpeechOptions = {
  channel?: OrionVoiceChannel;
  onFinish?: () => void;
};

function enabled(): boolean {
  const raw = String(process.env.EXPO_PUBLIC_ORION_ELEVENLABS_VOICE ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on';
}

async function configurePlaybackSession(): Promise<void> {
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

async function restorePlaybackSession(): Promise<void> {
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

export async function speakWithElevenLabs(
  text: string,
  options?: ElevenLabsSpeechOptions,
): Promise<boolean> {
  const clean = text.trim();
  if (!enabled() || !clean) return false;

  try {
    const result = await api.post<OrionVoiceResponse>('/api/orion/voice/synthesize', {
      text: clean,
      channel: options?.channel ?? 'orion',
    });
    const data = result.data;
    if (!result.success || !data?.success || !data.audio_base64) return false;

    await configurePlaybackSession();
    const source = {
      uri: `data:${data.mime_type || 'audio/mpeg'};base64,${data.audio_base64}`,
    };
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        options?.onFinish?.();
        void restorePlaybackSession();
        void sound.unloadAsync();
        return;
      }
      if (status.didJustFinish) {
        options?.onFinish?.();
        void restorePlaybackSession();
        void sound.unloadAsync();
      }
    });
    return true;
  } catch {
    return false;
  }
}
