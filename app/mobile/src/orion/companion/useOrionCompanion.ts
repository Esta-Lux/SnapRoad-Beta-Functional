import { useCallback, useEffect, useRef } from 'react';
import { isNavigationGuidanceSuppressed } from '../../navigation/navigationGuidanceMemory';
import type { DrivingMode } from '../../types';
import { LONG_DRIVE_MIN_MINUTES, SMOOTH_DRIVE_MIN_MINUTES } from './constants';
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
import type { OrionCompanionEventType, OrionDriveContextInput, OrionHudLineMeta } from './types';

export type OrionCompanionSnapshot = OrionDriveContextInput & {
  voiceMuted?: boolean;
  drivingMode?: DrivingMode;
};

export type UseOrionCompanionArgs = {
  enabled?: boolean;
  getSnapshot: () => OrionCompanionSnapshot;
  onCompanionLine?: (meta: OrionHudLineMeta) => void;
};

export function useOrionCompanion({
  enabled = orionCompanionV1Enabled(),
  getSnapshot,
  onCompanionLine,
}: UseOrionCompanionArgs) {
  const getSnapshotRef = useRef(getSnapshot);
  const onLineRef = useRef(onCompanionLine);
  const tripStartedRef = useRef(false);
  const driveStartedEmittedRef = useRef(false);
  const rerouteEmittedRef = useRef(false);
  const arrivalEmittedRef = useRef(false);
  const smoothEmittedRef = useRef(false);
  const longDriveEmittedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  useEffect(() => {
    onLineRef.current = onCompanionLine;
  }, [onCompanionLine]);

  const buildNavVoice = useCallback(
    (raw: OrionDriveContextInput) => buildOrionNavVoiceSnapshot(raw.nextStepDistanceMeters),
    [],
  );

  const emitOrionEvent = useCallback(
    async (event: OrionCompanionEventType, overrides?: Partial<OrionDriveContextInput>) => {
      if (!enabled) return;
      const snap = getSnapshotRef.current();
      if (snap.voiceMuted) return;

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
      });

      if (!result.shouldSpeak || !result.message) return;

      const mode = snap.drivingMode ?? 'adaptive';
      deliverCompanionSpeech({
        result,
        drivingMode: mode,
        voiceMuted: snap.voiceMuted,
        navVoice: buildNavVoice(raw),
        memory,
        rawContext: raw,
        onUiLine: (meta) => onLineRef.current?.(meta),
      });
    },
    [enabled, buildNavVoice],
  );

  const resetTripSession = useCallback(() => {
    tripStartedRef.current = false;
    driveStartedEmittedRef.current = false;
    rerouteEmittedRef.current = false;
    arrivalEmittedRef.current = false;
    smoothEmittedRef.current = false;
    longDriveEmittedRef.current = false;
    resetOrionTripSession();
  }, []);

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
      if (isNavigationGuidanceSuppressed()) {
        const wait = setInterval(() => {
          if (!isNavigationGuidanceSuppressed()) {
            clearInterval(wait);
            fire();
          }
        }, 500);
        setTimeout(() => clearInterval(wait), 12_000);
      } else {
        setTimeout(fire, 9000);
      }
    },
    [enabled, emitOrionEvent, resetTripSession],
  );

  const onReroute = useCallback(() => {
    if (!enabled || !tripStartedRef.current || rerouteEmittedRef.current) return;
    rerouteEmittedRef.current = true;
    void emitOrionEvent('reroute', { rerouteDetected: true });
    setTimeout(() => {
      rerouteEmittedRef.current = false;
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
    if (!enabled) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    pollRef.current = setInterval(() => {
      const snap = getSnapshotRef.current();
      if (!snap.isNavigating || snap.voiceMuted) return;

      const mins = snap.driveDurationMinutes ?? 0;
      if (!smoothEmittedRef.current && mins >= SMOOTH_DRIVE_MIN_MINUTES && !snap.rerouteDetected) {
        const traffic = snap.trafficLevel ?? 'unknown';
        if (traffic === 'light' || traffic === 'moderate' || traffic === 'unknown') {
          smoothEmittedRef.current = true;
          void emitOrionEvent('smooth_drive');
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
