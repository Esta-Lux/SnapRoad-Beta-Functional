// Trips Service - Placeholder implementations
// TODO: Integrate with database and Mapbox

interface StartTripData {
  userId: string;
  vehicleId: string;
  startLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

interface EndTripData {
  tripId: string;
  userId: string;
  endLocation: { lat: number; lng: number };
  routeGeometry?: any;
}

interface TripEventData {
  tripId: string;
  eventType: 'speeding' | 'hard_brake' | 'rapid_acceleration';
  severity: 'low' | 'medium' | 'high';
  location: { lat: number; lng: number };
  speedKmh?: number;
}

export const startNewTrip = async (data: StartTripData) => {
  // TODO: Implement trip start
  // - Create trip record
  // - Get optimized route from Mapbox
  // - Return trip details with route
  throw new Error('Not implemented - Integrate with Mapbox Directions API');
};

export const endTrip = async (data: EndTripData) => {
  // TODO: Implement trip end
  // - Update trip record
  // - Calculate driving score based on events
  // - Calculate fuel savings
  // - Award Gems using rewards service
  throw new Error('Not implemented');
};

export const getUserTrips = async (
  userId: string,
  options: { page: number; limit: number }
) => {
  // TODO: Fetch paginated trip history
  throw new Error('Not implemented');
};

export const getTripById = async (tripId: string, userId: string) => {
  // TODO: Fetch trip details with events
  throw new Error('Not implemented');
};

export const logDrivingEvent = async (data: TripEventData) => {
  // TODO: Log driving event
  // - Insert event record
  // - Update trip score calculation
  throw new Error('Not implemented');
};

export const getTripEvents = async (tripId: string) => {
  // TODO: Fetch all events for a trip
  throw new Error('Not implemented');
};

export const getActiveTrip = async (userId: string) => {
  // TODO: Get user's currently active trip
  throw new Error('Not implemented');
};
