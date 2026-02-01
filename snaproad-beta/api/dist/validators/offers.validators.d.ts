import { z } from 'zod';
export declare const redeemOfferSchema: z.ZodObject<{
    location: z.ZodOptional<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    location?: {
        lat: number;
        lng: number;
    } | undefined;
}, {
    location?: {
        lat: number;
        lng: number;
    } | undefined;
}>;
//# sourceMappingURL=offers.validators.d.ts.map