import { z } from 'zod';
export declare const createVehicleSchema: z.ZodObject<{
    make: z.ZodString;
    model: z.ZodString;
    year: z.ZodNumber;
    fuelType: z.ZodEnum<["gas", "diesel", "electric", "hybrid"]>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    make: string;
    model: string;
    year: number;
    fuelType: "gas" | "diesel" | "electric" | "hybrid";
    isPrimary?: boolean | undefined;
}, {
    make: string;
    model: string;
    year: number;
    fuelType: "gas" | "diesel" | "electric" | "hybrid";
    isPrimary?: boolean | undefined;
}>;
export declare const updateVehicleSchema: z.ZodObject<{
    make: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    fuelType: z.ZodOptional<z.ZodEnum<["gas", "diesel", "electric", "hybrid"]>>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    make?: string | undefined;
    model?: string | undefined;
    year?: number | undefined;
    fuelType?: "gas" | "diesel" | "electric" | "hybrid" | undefined;
    isPrimary?: boolean | undefined;
}, {
    make?: string | undefined;
    model?: string | undefined;
    year?: number | undefined;
    fuelType?: "gas" | "diesel" | "electric" | "hybrid" | undefined;
    isPrimary?: boolean | undefined;
}>;
//# sourceMappingURL=vehicles.validators.d.ts.map