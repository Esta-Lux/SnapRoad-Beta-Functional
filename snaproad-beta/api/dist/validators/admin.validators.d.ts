import { z } from 'zod';
export declare const moderateIncidentSchema: z.ZodObject<{
    action: z.ZodEnum<["approve", "reject", "flag"]>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "approve" | "reject" | "flag";
    notes?: string | undefined;
}, {
    action: "approve" | "reject" | "flag";
    notes?: string | undefined;
}>;
export declare const adjustRewardsSchema: z.ZodObject<{
    userId: z.ZodString;
    gemsAmount: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    userId: string;
    gemsAmount: number;
}, {
    reason: string;
    userId: string;
    gemsAmount: number;
}>;
export declare const updatePartnerStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["pending", "active", "suspended"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "pending" | "suspended";
    reason?: string | undefined;
}, {
    status: "active" | "pending" | "suspended";
    reason?: string | undefined;
}>;
//# sourceMappingURL=admin.validators.d.ts.map