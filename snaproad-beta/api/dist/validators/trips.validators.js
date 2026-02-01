"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tripEventSchema = exports.endTripSchema = exports.startTripSchema = void 0;
const zod_1 = require("zod");
const locationSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180)
});
exports.startTripSchema = zod_1.z.object({
    vehicleId: zod_1.z.string().uuid('Invalid vehicle ID'),
    startLocation: locationSchema,
    destination: locationSchema
});
exports.endTripSchema = zod_1.z.object({
    endLocation: locationSchema,
    routeGeometry: zod_1.z.any().optional()
});
exports.tripEventSchema = zod_1.z.object({
    eventType: zod_1.z.enum(['speeding', 'hard_brake', 'rapid_acceleration']),
    severity: zod_1.z.enum(['low', 'medium', 'high']),
    location: locationSchema,
    speedKmh: zod_1.z.number().positive().optional()
});
//# sourceMappingURL=trips.validators.js.map