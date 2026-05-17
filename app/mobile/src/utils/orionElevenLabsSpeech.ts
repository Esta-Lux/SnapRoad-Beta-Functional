import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { File as FsFile, Paths } from 'expo-file-system';
import Constants from 'expo-constants';
import api from '../api/client';
import { unwrapApiData } from '../api/dto/profileWallet';

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
  const extra = Constants.expoConfig?.extra as { orionElevenLabsVoiceEnabled?: boolean | string } | undefined;
  const raw = String(
    process.env.EXPO_PUBLIC_ORION_ELEVENLABS_VOICE ?? extra?.orionElevenLabsVoiceEnabled ?? '1',
  ).trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
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

function normalizeVoicePayload(raw: unknown): OrionVoiceResponse | null {
  const unwrapped = unwrapApiData(raw);
  const rec = unwrapped && typeof unwrapped === 'object' ? (unwrapped as OrionVoiceResponse) : null;
  return rec;
}

async function deleteFsFileQuiet(uri: string): Promise<void> {
  try {
    const f = new FsFile(uri);
    if (f.exists) f.delete();
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

  let cacheUri: string | null = null;
  try {
    const result = await api.post<unknown>('/api/orion/voice/synthesize', {
      text: clean,
      channel: options?.channel ?? 'orion',
    });
    const data = normalizeVoicePayload(result.data);
    if (!result.success || !data?.success || !data.audio_base64?.trim()) return false;

    await configurePlaybackSession();

    /** Data-URI playback is flaky on some Android builds; cache MP3 bytes then play `file://`. */
    const fsFile = new FsFile(
      Paths.cache,
      `orion-tts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.mp3`,
    );
    fsFile.create({ overwrite: true });
    fsFile.write(data.audio_base64.trim(), { encoding: 'base64' });
    cacheUri = fsFile.uri;

    const { sound } = await Audio.Sound.createAsync({ uri: cacheUri }, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        options?.onFinish?.();
        void restorePlaybackSession();
        void sound.unloadAsync();
        void deleteFsFileQuiet(cacheUri!);
        return;
      }
      if (status.didJustFinish) {
        options?.onFinish?.();
        void restorePlaybackSession();
        void sound.unloadAsync();
        void deleteFsFileQuiet(cacheUri!);
      }
    });
    return true;
  } catch {
    if (cacheUri) void deleteFsFileQuiet(cacheUri);
    return false;
  }
}
