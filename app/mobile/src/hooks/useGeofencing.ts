/**
 * Geofencing is disabled until the Family backend is live.
 * The /api/family/event endpoint is a 503 stub — enabling this hook spams
 * failed requests and drains battery on every fence crossing.
 */

export type GeofencePlace = {
  id: string;
  lat: number;
  lng: number;
  radius?: number;
};

export function useGeofencing(_places: GeofencePlace[], _enabled: boolean) {
  // no-op until family backend is implemented
}
