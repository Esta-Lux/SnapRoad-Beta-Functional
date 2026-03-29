import { useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from '../api/client';

const GEOFENCE_TASK = 'snaproad-geofences';

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { eventType, region } = data as any;
  const type = eventType === Location.GeofencingEventType.Enter ? 'arrival' : 'departure';
  await api.post('/api/family/event', { type, place_id: region.identifier }).catch(() => {});
});

export type GeofencePlace = {
  id: string;
  lat: number;
  lng: number;
  radius?: number;
};

export function useGeofencing(places: GeofencePlace[], enabled: boolean) {
  const syncGeofencing = useCallback(async () => {
    if (!enabled) {
      try {
        await Location.stopGeofencingAsync(GEOFENCE_TASK);
      } catch (e) {
        if (__DEV__) console.warn('[useGeofencing] stopGeofencingAsync (disabled)', e);
      }
      return;
    }

    if (places.length === 0) {
      try {
        await Location.stopGeofencingAsync(GEOFENCE_TASK);
      } catch (e) {
        if (__DEV__) console.warn('[useGeofencing] stopGeofencingAsync (no places)', e);
      }
      return;
    }

    const regions = places.map((p) => ({
      identifier: p.id,
      latitude: p.lat,
      longitude: p.lng,
      radius: p.radius || 200,
      notifyOnEnter: true,
      notifyOnExit: true,
    }));

    try {
      await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    } catch (e) {
      if (__DEV__) console.warn('[useGeofencing] startGeofencingAsync', e);
    }
  }, [enabled, places]);

  useEffect(() => {
    void syncGeofencing();
    return () => {
      Location.stopGeofencingAsync(GEOFENCE_TASK).catch((e) => {
        if (__DEV__) console.warn('[useGeofencing] cleanup stopGeofencingAsync', e);
      });
    };
  }, [syncGeofencing]);
}
