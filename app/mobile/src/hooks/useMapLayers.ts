import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

const KEY = 'snaproad_map_layers';

interface LayerState {
  showTraffic: boolean;
  showIncidents: boolean;
  showCameras: boolean;
  showConstruction: boolean;
  showPhotoReports: boolean;
  /** Open data speed camera / traffic safety POIs (not available in some regions). */
  showTrafficSafety: boolean;
}

const DEFAULTS: LayerState = {
  showTraffic: true,
  showIncidents: true,
  showCameras: false,
  showConstruction: false,
  showPhotoReports: false,
  showTrafficSafety: false,
};

function loadSaved(): LayerState {
  try {
    const raw = storage.getString(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const { showOsm: _removed, showFuel: _removedFuel, ...rest } = parsed;
        return { ...DEFAULTS, ...rest };
      }
    }
  } catch {}
  return DEFAULTS;
}

export function useMapLayers() {
  const [state, setState] = useState<LayerState>(loadSaved);

  useEffect(() => {
    try { storage.set(KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const toggle = useCallback((key: keyof LayerState) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setShowTraffic = useCallback((v: boolean) => setState((p) => ({ ...p, showTraffic: v })), []);
  const setShowIncidents = useCallback((v: boolean) => setState((p) => ({ ...p, showIncidents: v })), []);
  const setShowCameras = useCallback((v: boolean) => setState((p) => ({ ...p, showCameras: v })), []);
  const setShowConstruction = useCallback((v: boolean) => setState((p) => ({ ...p, showConstruction: v })), []);
  const setShowPhotoReports = useCallback((v: boolean) => setState((p) => ({ ...p, showPhotoReports: v })), []);
  const setShowTrafficSafety = useCallback((v: boolean) => setState((p) => ({ ...p, showTrafficSafety: v })), []);

  return {
    ...state,
    toggle,
    setShowTraffic,
    setShowIncidents,
    setShowCameras,
    setShowConstruction,
    setShowPhotoReports,
    setShowTrafficSafety,
  };
}
