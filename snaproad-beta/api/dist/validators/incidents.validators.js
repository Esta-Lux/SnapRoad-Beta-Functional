"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPhotoSchema = exports.createIncidentSchema = void 0;
const zod_1 = require("zod");
const locationSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180)
});
exports.createIncidentSchema = zod_1.z.object({
    incidentType: zod_1.z.enum(['accident', 'hazard', 'violation', 'other']),
    description: zod_1.z.string().max(1000).optional(),
    location: locationSchema
});
exports.uploadPhotoSchema = zod_1.z.object({
// Photos are handled by multer middleware
});
//# sourceMappingURL=incidents.validators.js.map