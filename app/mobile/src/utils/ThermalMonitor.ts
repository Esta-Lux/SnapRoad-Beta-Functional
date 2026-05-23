import { useEffect, useMemo, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import * as Battery from 'expo-battery';

export type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical';

export type ThermalMitigations = {
  reduceGpsAccuracy: boolean;
  reduceMapDetail: boolean;
  batchNetwork: boolean;
  pauseNonCriticalLayers: boolean;
  disableCameraPreview: boolean;
  animationScale: number;
};

function normalizeNativeThermalState(raw: unknown): ThermalState | null {
  if (typeof raw === 'string') {
    const v = raw.toLowerCase();
    if (v === 'nominal' || v === 'fair' || v === 'serious' || v === 'critical') return v;
    if (v === 'warning') return 'serious';
  }
  if (typeof raw === 'number') {
    if (raw >= 3) return 'critical';
    if (raw === 2) return 'serious';
    if (raw === 1) return 'fair';
    return 'nominal';
  }
  return null;
}

async function readNativeThermalState(): Promise<ThermalState | null> {
  const mod = NativeModules.ThermalModule as
    | { getThermalState?: () => Promise<unknown> | unknown }
    | undefined;
  if (!mod?.getThermalState) return null;
  try {
    const state = await mod.getThermalState();
    return normalizeNativeThermalState(state);
  } catch {
    return null;
  }
}

async function inferBatteryThermalState(isNavigating: boolean): Promise<ThermalState> {
  if (!isNavigating) return 'nominal';
  try {
    const [batteryLevel, batteryState, lowPowerMode] = await Promise.all([
      Battery.getBatteryLevelAsync().catch(() => 1),
      Battery.getBatteryStateAsync().catch(() => Battery.BatteryState.UNKNOWN),
      Battery.isLowPowerModeEnabledAsync().catch(() => false),
    ]);

    if (lowPowerMode) return 'fair';
    if (batteryState === Battery.BatteryState.UNPLUGGED && batteryLevel <= 0.08) return 'serious';
    if (batteryState === Battery.BatteryState.UNPLUGGED && batteryLevel <= 0.15) return 'fair';
    return 'nominal';
  } catch {
    return 'nominal';
  }
}

export function thermalMitigationsForState(state: ThermalState): ThermalMitigations {
  switch (state) {
    case 'critical':
      return {
        reduceGpsAccuracy: true,
        reduceMapDetail: true,
        batchNetwork: true,
        pauseNonCriticalLayers: true,
        disableCameraPreview: true,
        animationScale: 0,
      };
    case 'serious':
      return {
        reduceGpsAccuracy: true,
        reduceMapDetail: true,
        batchNetwork: true,
        pauseNonCriticalLayers: true,
        disableCameraPreview: true,
        animationScale: 0.35,
      };
    case 'fair':
      return {
        reduceGpsAccuracy: false,
        reduceMapDetail: true,
        batchNetwork: true,
        pauseNonCriticalLayers: false,
        disableCameraPreview: false,
        animationScale: 0.7,
      };
    default:
      return {
        reduceGpsAccuracy: false,
        reduceMapDetail: false,
        batchNetwork: false,
        pauseNonCriticalLayers: false,
        disableCameraPreview: false,
        animationScale: 1,
      };
  }
}

export function useThermalMonitor(isNavigating: boolean): ThermalState {
  const [state, setState] = useState<ThermalState>('nominal');

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const nativeState = Platform.OS === 'web' ? null : await readNativeThermalState();
      const next = nativeState ?? (await inferBatteryThermalState(isNavigating));
      if (!cancelled) setState(next);
    };

    void tick();
    const id = setInterval(tick, isNavigating ? 30_000 : 90_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isNavigating]);

  return state;
}

export function useThermalMitigations(isNavigating: boolean): {
  state: ThermalState;
  mitigations: ThermalMitigations;
} {
  const state = useThermalMonitor(isNavigating);
  const mitigations = useMemo(() => thermalMitigationsForState(state), [state]);
  return { state, mitigations };
}
