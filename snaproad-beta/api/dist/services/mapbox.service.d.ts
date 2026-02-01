interface Coordinates {
    lat: number;
    lng: number;
}
interface RouteOptions {
    start: Coordinates;
    end: Coordinates;
    optimizeFor?: 'time' | 'fuel';
    alternatives?: boolean;
}
/**
 * Get optimized route between two points
 */
export declare const getOptimizedRoute: (options: RouteOptions) => Promise<never>;
/**
 * Geocode an address to coordinates
 */
export declare const geocodeAddress: (address: string) => Promise<never>;
/**
 * Reverse geocode coordinates to address
 */
export declare const reverseGeocode: (coordinates: Coordinates) => Promise<never>;
/**
 * Calculate fuel-efficient route
 * Considers traffic, elevation, and stop frequency
 */
export declare const calculateFuelEfficientRoute: (start: Coordinates, end: Coordinates, vehicleFuelType: string) => Promise<never>;
export {};
//# sourceMappingURL=mapbox.service.d.ts.map