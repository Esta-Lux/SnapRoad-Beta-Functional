interface StartTripData {
    userId: string;
    vehicleId: string;
    startLocation: {
        lat: number;
        lng: number;
    };
    destination: {
        lat: number;
        lng: number;
    };
}
interface EndTripData {
    tripId: string;
    userId: string;
    endLocation: {
        lat: number;
        lng: number;
    };
    routeGeometry?: any;
}
interface TripEventData {
    tripId: string;
    eventType: 'speeding' | 'hard_brake' | 'rapid_acceleration';
    severity: 'low' | 'medium' | 'high';
    location: {
        lat: number;
        lng: number;
    };
    speedKmh?: number;
}
export declare const startNewTrip: (data: StartTripData) => Promise<never>;
export declare const endTrip: (data: EndTripData) => Promise<never>;
export declare const getUserTrips: (userId: string, options: {
    page: number;
    limit: number;
}) => Promise<never>;
export declare const getTripById: (tripId: string, userId: string) => Promise<never>;
export declare const logDrivingEvent: (data: TripEventData) => Promise<never>;
export declare const getTripEvents: (tripId: string) => Promise<never>;
export declare const getActiveTrip: (userId: string) => Promise<never>;
export {};
//# sourceMappingURL=trips.service.d.ts.map