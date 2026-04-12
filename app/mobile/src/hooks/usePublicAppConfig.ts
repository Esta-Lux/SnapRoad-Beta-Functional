import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { unwrapApiData } from '../api/dto/offers';

/** Mirrors backend `services.runtime_config.cfg_enabled` defaults (missing key → default). */
function readConfigBool(config: Record<string, unknown>, key: string, defaultVal: boolean): boolean {
  if (!(key in config)) return defaultVal;
  const v = config[key];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'off' || s === '') return false;
  }
  return defaultVal;
}

/**
 * Public GET /api/config (cached ~60s on server). Used for admin kill switches that must match mobile.
 * When `enabled` is false, the last fetched values are kept (no network).
 */
export function usePublicAppConfig(enabled: boolean) {
  const [friendTrackingEnabled, setFriendTrackingEnabled] = useState(true);
  const [liveLocationPublishingEnabled, setLiveLocationPublishingEnabled] = useState(true);

  const refresh = useCallback(async () => {
    const r = await api.get('/api/config');
    if (!r.success) return;
    const raw = unwrapApiData(r.data);
    if (!raw || typeof raw !== 'object') return;
    const cfg = raw as Record<string, unknown>;
    setFriendTrackingEnabled(readConfigBool(cfg, 'friend_tracking_enabled', true));
    setLiveLocationPublishingEnabled(readConfigBool(cfg, 'live_location_publishing_enabled', true));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return { friendTrackingEnabled, liveLocationPublishingEnabled, refresh };
}
