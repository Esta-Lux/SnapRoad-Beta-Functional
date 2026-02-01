"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVehicleSchema = exports.createVehicleSchema = void 0;
const zod_1 = require("zod");
exports.createVehicleSchema = zod_1.z.object({
    make: zod_1.z.string().min(1, 'Make is required').max(100),
    model: zod_1.z.string().min(1, 'Model is required').max(100),
    year: zod_1.z.number().int().min(1900).max(new Date().getFullYear() + 1),
    fuelType: zod_1.z.enum(['gas', 'diesel', 'electric', 'hybrid']),
    isPrimary: zod_1.z.boolean().optional()
});
exports.updateVehicleSchema = zod_1.z.object({
    make: zod_1.z.string().min(1).max(100).optional(),
    model: zod_1.z.string().min(1).max(100).optional(),
    year: zod_1.z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    fuelType: zod_1.z.enum(['gas', 'diesel', 'electric', 'hybrid']).optional(),
    isPrimary: zod_1.z.boolean().optional()
});
//# sourceMappingURL=vehicles.validators.js.map