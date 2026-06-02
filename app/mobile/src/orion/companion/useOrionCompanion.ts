import { useCallback, useEffect, useRef } from 'react';
import { isNavigationGuidanceSuppressed } from '../../navigation/navigationGuidanceMemory';
import type { DrivingMode } from '../../types';
import {
  LONG_DRIVE_MIN_MINUTES,
  SMOOTH_DRIVE_MIN_MINUTES,
  SMOOTH_DRIVE_REPEAT_MINUTES,
} from './constants';
import { buildOrionNavVoiceSnapshot } from './orionNavVoiceSnapshot';
import { evaluateOrionCompanion } from './OrionCompanionEngine';
import {
  getOrionCompanionMemory,
  getOrionTripSession,
  initOrionTripSession,
  resetOrionTripSession,
} from './orionCompanionShared';
import { deliverCompanionSpeech } from './OrionSpeechCoordinator';
import { orionCompanionV1Enabled } from './orionCompanionFlags';
import type { LlmDialogueProvider } from './llmDialogueProvider';
import { subscribeOrionNavigationEvents } from './orionNavEventBus';
import type { OrionPreferences } from '../../types/orionPreferences';
import { DEFAULT_ORION_PREFERENCES } from '../../types/orionPreferences';
import type { OrionCompanionEventType, OrionDriveContextInput, OrionHudLineMeta } from './types';

const DRIVE_STARTED_DELAY_MS = 4000;
const GUIDANCE_WAIT_MAX_MS = 12_000;
const SMOOTH_DRIVE_MAX_CHECKINS = 3;

export type OrionCompanionSnapshot = OrionDriveContextInput & {
  voiceMuted?: boolean;
  drivingMode?: DrivingMode;
};

export type UseOrionCompanionArgs = {
  enabled?: boolean;
  getSnapshot: () => OrionCompanionSnapshot;
  getOrionPrefs?: () => OrionPreferences;
  getLlm?: () => LlmDialogueProvider | undefined;
  onCompanionLine?: (meta: OrionHudLineMeta) => void;
};

export function useOrionCompanion({
  enabled = orionCompanionV1Enabled(),
  getSnapshot,
  getOrionPrefs,
  getLlm,
  onCompanionLine,
}: UseOrionCompanionArgs) {
  const getSnapshotRef = useRef(getSnapshot);
  const getOrionPrefsRef = useRef(getOrionPrefs);
  const getLlmRef = useRef(getLlm);
  const onLineRef = useRef(onCompanionLine);
  const tripStartedRef = useRef(false);
  const driveStartedEmittedRef = useRef(false);
  const rerouteEmittedRef = useRef(false);
  const arrivalEmittedRef = useRef(false);
  const smoothCheckinsRef = useRef(0);
  const smoothLastCheckinAtMsRef = useRef(0);
  const longDriveEmittedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const guidanceWaitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const guidanceWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const driveStartedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rerouteCooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGuidanceWait = useCallback(() => {
    if (guidanceWaitIntervalRef.current != null) {
      clearInterval(guidanceWaitIntervalRef.current);
      guidanceWaitIntervalRef.current = null;
    }
    if (guidanceWaitTimeoutRef.current != null) {
      clearTimeout(guidanceWaitTimeoutRef.current);
      guidanceWaitTimeoutRef.current = null;
    }
  }, []);

  const clearDriveStartedTimeout = useCallback(() => {
    if (driveStartedTimeoutRef.current != null) {
      clearTimeout(driveStartedTimeoutRef.current);
      driveStartedTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  useEffect(() => {
    getOrionPrefsRef.current = getOrionPrefs;
  }, [getOrionPrefs]);

  useEffect(() => {
    getLlmRef.current = getLlm;
  }, [getLlm]);

  useEffect(() => {
    onLineRef.current = onCompanionLine;
  }, [onCompanionLine]);

  const buildNavVoice = useCallback(
    (raw: OrionDriveContextInput) => buildOrionNavVoiceSnapshot(raw.nextStepDistanceMeters),
    [],
  );

  const emitOrionEvent = useCallback(
    async (event: OrionCompanionEventType, overrides?: Partial<OrionDriveContextInput>) => {
      if (!enabled) return false;
      try {
        const snap = getSnapshotRef.current();
        if (snap.voiceMuted) return false;
        const prefs = getOrionPrefsRef.current?.() ?? DEFAULT_ORION_PREFERENCES;
        if (!prefs.auto_buddy) return false;

        const raw: OrionDriveContextInput = {
          ...snap,
          ...overrides,
          nowMs: overrides?.nowMs ?? Date.now(),
        };

        const memory = getOrionCompanionMemory();
        const session = getOrionTripSession();

        const result = await evaluateOrionCompanion(event, raw, {
          memory,
          session,
          navVoice: buildNavVoice(raw),
          llm: prefs.use_llm_buddy ? getLlmRef.current?.() : undefined,
          preferredMood: prefs.mood,
        });

        if (!result.shouldSpeak || !result.message) return false;

        const mode = snap.drivingMode ?? 'adaptive';
        const speech = deliverCompanionSpeech({
          result,
          drivingMode: mode,
          voiceMuted: snap.voiceMuted,
          navVoice: buildNavVoice(raw),
          memory,
          rawContext: raw,
          onUiLine: (meta) => onLineRef.current?.(meta),
        });
        return speech.spoken;
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[OrionCompanion] emitOrionEvent failed', event, err);
        }
        return false;
      }
    },
    [enabled, buildNavVoice],
  );

  const resetTripSession = useCallback(() => {
    tripStartedRef.current = false;
    driveStartedEmittedRef.current = false;
    rerouteEmittedRef.current = false;
    arrivalEmittedRef.current = false;
    smoothCheckinsRef.current = 0;
    smoothLastCheckinAtMsRef.current = 0;
    longDriveEmittedRef.current = false;
    clearGuidanceWait();
    clearDriveStartedTimeout();
    if (rerouteCooldownTimeoutRef.current != null) {
      clearTimeout(rerouteCooldownTimeoutRef.current);
      rerouteCooldownTimeoutRef.current = null;
    }
    resetOrionTripSession();
  }, [clearGuidanceWait, clearDriveStartedTimeout]);

  const onNavigationStarted = useCallback(
    (tripId: string) => {
      if (!enabled) return;
      resetTripSession();
      initOrionTripSession(tripId);
      tripStartedRef.current = true;
      const fire = () => {
        if (driveStartedEmittedRef.current) return;
        driveStartedEmittedRef.current = true;
        void emitOrionEvent('drive_started', { tripId, isNavigating: true });
      };
      clearGuidanceWait();
      clearDriveStartedTimeout();
      if (isNavigationGuidanceSuppressed()) {
        guidanceWaitIntervalRef.current = setInterval(() => {
          if (!isNavigationGuidanceSuppressed()) {
            clearGuidanceWait();
            fire();
          }
        }, 500);
        guidanceWaitTimeoutRef.current = setTimeout(() => {
          clearGuidanceWait();
        }, GUIDANCE_WAIT_MAX_MS);
      } else {
        driveStartedTimeoutRef.current = setTimeout(fire, DRIVE_STARTED_DELAY_MS);
      }
    },
    [enabled, emitOrionEvent, resetTripSession, clearGuidanceWait, clearDriveStartedTimeout],
  );

  const onReroute = useCallback(() => {
    if (!enabled || !tripStartedRef.current || rerouteEmittedRef.current) return;
    rerouteEmittedRef.current = true;
    void emitOrionEvent('reroute', { rerouteDetected: true });
    if (rerouteCooldownTimeoutRef.current != null) {
      clearTimeout(rerouteCooldownTimeoutRef.current);
    }
    rerouteCooldownTimeoutRef.current = setTimeout(() => {
      rerouteEmittedRef.current = false;
      rerouteCooldownTimeoutRef.current = null;
    }, 60_000);
  }, [enabled, emitOrionEvent]);

  const onArrival = useCallback(() => {
    if (!enabled || arrivalEmittedRef.current) return;
    arrivalEmittedRef.current = true;
    void emitOrionEvent('arrival', { isNavigating: false });
    resetTripSession();
  }, [enabled, emitOrionEvent, resetTripSession]);

  const onRewardEarned = useCallback(
    (gemsDelta: number) => {
      if (!enabled || gemsDelta <= 0) return;
      void emitOrionEvent('reward_earned', {
        gemsEarnedThisTrip: gemsDelta,
      });
    },
    [enabled, emitOrionEvent],
  );

  const onHeavyTraffic = useCallback(() => {
    if (!enabled) return;
    void emitOrionEvent('heavy_traffic', { trafficLevel: 'heavy', congestionNearManeuver: true });
  }, [enabled, emitOrionEvent]);

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeOrionNavigationEvents((event) => {
      if (event.type === 'navigation_started') {
        onNavigationStarted(event.tripId);
      } else if (event.type === 'reroute') {
        onReroute();
      } else if (event.type === 'arrival') {
        onArrival();
      } else if (event.type === 'reward_earned') {
        onRewardEarned(event.gemsDelta);
      } else if (event.type === 'heavy_traffic') {
        onHeavyTraffic();
      } else if (event.type === 'navigation_reset') {
        resetTripSession();
      }
    });
  }, [
    enabled,
    onNavigationStarted,
    onReroute,
    onArrival,
    onRewardEarned,
    onHeavyTraffic,
    resetTripSession,
  ]);

  useEffect(() => {
    if (!enabled) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    pollRef.current = setInterval(() => {
      const snap = getSnapshotRef.current();
      if (!snap.isNavigating || snap.voiceMuted) return;

      const mins = snap.driveDurationMinutes ?? 0;
      const nowMs = Date.now();
      const smoothReady =
        mins >= SMOOTH_DRIVE_MIN_MINUTES &&
        smoothCheckinsRef.current < SMOOTH_DRIVE_MAX_CHECKINS &&
        (smoothLastCheckinAtMsRef.current === 0 ||
          nowMs - smoothLastCheckinAtMsRef.current >= SMOOTH_DRIVE_REPEAT_MINUTES * 60_000);
      if (smoothReady && !snap.rerouteDetected) {
        const traffic = snap.trafficLevel ?? 'unknown';
        if (traffic === 'light' || traffic === 'moderate' || traffic === 'unknown') {
          void emitOrionEvent('smooth_drive').then((spoken) => {
            if (!spoken) return;
            smoothCheckinsRef.current += 1;
            smoothLastCheckinAtMsRef.current = nowMs;
          });
        }
      }

      if (!longDriveEmittedRef.current && mins >= LONG_DRIVE_MIN_MINUTES) {
        longDriveEmittedRef.current = true;
        void emitOrionEvent('long_drive');
      }
    }, 60_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [enabled, emitOrionEvent]);

  useEffect(
    () => () => {
      resetTripSession();
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [resetTripSession],
  );

  return {
    emitOrionEvent,
    onNavigationStarted,
    onReroute,
    onArrival,
    onRewardEarned,
    onHeavyTraffic,
    resetTripSession,
    memory: getOrionCompanionMemory(),
    buildNavVoice,
  };
}
