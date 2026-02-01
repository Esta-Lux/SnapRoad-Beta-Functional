import { z } from 'zod';
export declare const startTripSchema: z.ZodObject<{
    vehicleId: z.ZodString;
    startLocation: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>;
    destination: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>;
}, "strip", z.ZodTypeAny, {
    vehicleId: string;
    startLocation: {
        lat: number;
        lng: number;
    };
    destination: {
        lat: number;
        lng: number;
    };
}, {
    vehicleId: string;
    startLocation: {
        lat: number;
        lng: number;
    };
    destination: {
        lat: number;
        lng: number;
    };
}>;
export declare const endTripSchema: z.ZodObject<{
    endLocation: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>;
    routeGeometry: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    endLocation: {
        lat: number;
        lng: number;
    };
    routeGeometry?: any;
}, {
    endLocation: {
        lat: number;
        lng: number;
    };
    routeGeometry?: any;
}>;
export declare const tripEventSchema: z.ZodObject<{
    eventType: z.ZodEnum<["speeding", "hard_brake", "rapid_acceleration"]>;
    severity: z.ZodEnum<["low", "medium", "high"]>;
    location: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>;
    speedKmh: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    eventType: "speeding" | "hard_brake" | "rapid_acceleration";
    severity: "low" | "medium" | "high";
    location: {
        lat: number;
        lng: number;
    };
    speedKmh?: number | undefined;
}, {
    eventType: "speeding" | "hard_brake" | "rapid_acceleration";
    severity: "low" | "medium" | "high";
    location: {
        lat: number;
        lng: number;
    };
    speedKmh?: number | undefined;
}>;
//# sourceMappingURL=trips.validators.d.ts.map