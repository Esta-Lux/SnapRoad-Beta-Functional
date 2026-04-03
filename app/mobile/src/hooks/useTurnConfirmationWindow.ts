import { useEffect, useRef, useState } from 'react';
import type { DrivingMode } from '../types';

/**
 * After the route step index advances, keep a continuation-style card emphasis for a mode-tuned window.
 * Uses state so the UI updates immediately on step change; timer clears the window without waiting on GPS.
 */
export function useTurnConfirmationUntil(
  isNavigating: boolean,
  currentStepIndex: number,
  drivingMode: DrivingMode,
): number {
  const [confirmUntil, setConfirmUntil] = useState(0);
  const prevIdxRef = useRef(-1);

  useEffect(() => {
    if (!isNavigating) {
      setConfirmUntil(0);
      prevIdxRef.current = -1;
      return;
    }
    if (prevIdxRef.current < 0) {
      prevIdxRef.current = currentStepIndex;
      return;
    }
    if (currentStepIndex > prevIdxRef.current) {
      const ms =
        drivingMode === 'calm' ? 4800 :
        drivingMode === 'sport' ? 2400 :
        3600;
      setConfirmUntil(Date.now() + ms);
    }
    prevIdxRef.current = currentStepIndex;
  }, [isNavigating, currentStepIndex, drivingMode]);

  useEffect(() => {
    if (confirmUntil <= 0) return;
    const left = confirmUntil - Date.now();
    const t = setTimeout(() => setConfirmUntil(0), Math.max(0, left) + 30);
    return () => clearTimeout(t);
  }, [confirmUntil]);

  return confirmUntil;
}
