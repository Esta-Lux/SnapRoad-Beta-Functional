import { z } from 'zod';
export declare const createIncidentSchema: z.ZodObject<{
    incidentType: z.ZodEnum<["accident", "hazard", "violation", "other"]>;
    description: z.ZodOptional<z.ZodString>;
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
}, "strip", z.ZodTypeAny, {
    location: {
        lat: number;
        lng: number;
    };
    incidentType: "accident" | "hazard" | "violation" | "other";
    description?: string | undefined;
}, {
    location: {
        lat: number;
        lng: number;
    };
    incidentType: "accident" | "hazard" | "violation" | "other";
    description?: string | undefined;
}>;
export declare const uploadPhotoSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
//# sourceMappingURL=incidents.validators.d.ts.map