import { z } from 'zod';
export declare const registerPartnerSchema: z.ZodObject<{
    businessName: z.ZodString;
    contactEmail: z.ZodString;
    contactPhone: z.ZodOptional<z.ZodString>;
    subscriptionPlan: z.ZodEnum<["local", "growth", "enterprise"]>;
}, "strip", z.ZodTypeAny, {
    businessName: string;
    contactEmail: string;
    subscriptionPlan: "local" | "growth" | "enterprise";
    contactPhone?: string | undefined;
}, {
    businessName: string;
    contactEmail: string;
    subscriptionPlan: "local" | "growth" | "enterprise";
    contactPhone?: string | undefined;
}>;
export declare const createOfferSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    discountPercent: z.ZodNumber;
    gemsRequired: z.ZodNumber;
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
    radiusKm: z.ZodOptional<z.ZodNumber>;
    bannerUrl: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    location: {
        lat: number;
        lng: number;
    };
    title: string;
    discountPercent: number;
    gemsRequired: number;
    description?: string | undefined;
    radiusKm?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    bannerUrl?: string | undefined;
}, {
    location: {
        lat: number;
        lng: number;
    };
    title: string;
    discountPercent: number;
    gemsRequired: number;
    description?: string | undefined;
    radiusKm?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    bannerUrl?: string | undefined;
}>;
export declare const updateOfferSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    discountPercent: z.ZodOptional<z.ZodNumber>;
    gemsRequired: z.ZodOptional<z.ZodNumber>;
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
    radiusKm: z.ZodOptional<z.ZodNumber>;
    bannerUrl: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "paused", "expired"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "paused" | "expired" | undefined;
    location?: {
        lat: number;
        lng: number;
    } | undefined;
    description?: string | undefined;
    radiusKm?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    title?: string | undefined;
    discountPercent?: number | undefined;
    gemsRequired?: number | undefined;
    bannerUrl?: string | undefined;
}, {
    status?: "active" | "paused" | "expired" | undefined;
    location?: {
        lat: number;
        lng: number;
    } | undefined;
    description?: string | undefined;
    radiusKm?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    title?: string | undefined;
    discountPercent?: number | undefined;
    gemsRequired?: number | undefined;
    bannerUrl?: string | undefined;
}>;
//# sourceMappingURL=partners.validators.d.ts.map