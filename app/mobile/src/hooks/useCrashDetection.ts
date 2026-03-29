import { useEffect, useRef, useState, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';

const THRESHOLD_MS2 = 30;
const DEBOUNCE_MS = 30_000;
const UPDATE_INTERVAL_MS = 100;

export function useCrashDetection() {
  const [crashDetected, setCrashDetected] = useState(false);
  const lastTrigger = useRef(0);

  const dismissCrash = useCallback(() => {
    setCrashDetected(false);
  }, []);

  useEffect(() => {
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // expo-sensors reports in g-units; convert to m/s²
      const magnitude = Math.sqrt(x * x + y * y + z * z) * 9.81;
      if (magnitude > THRESHOLD_MS2 && Date.now() - lastTrigger.current > DEBOUNCE_MS) {
        lastTrigger.current = Date.now();
        setCrashDetected(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { crashDetected, dismissCrash };
}

export default useCrashDetection;
