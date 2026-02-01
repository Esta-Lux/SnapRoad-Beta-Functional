"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOfferSchema = exports.createOfferSchema = exports.registerPartnerSchema = void 0;
const zod_1 = require("zod");
const locationSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180)
});
exports.registerPartnerSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(2, 'Business name is required').max(255),
    contactEmail: zod_1.z.string().email('Invalid email address'),
    contactPhone: zod_1.z.string().optional(),
    subscriptionPlan: zod_1.z.enum(['local', 'growth', 'enterprise'])
});
exports.createOfferSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(255),
    description: zod_1.z.string().max(1000).optional(),
    discountPercent: zod_1.z.number().int().min(1).max(100),
    gemsRequired: zod_1.z.number().int().min(1),
    location: locationSchema,
    radiusKm: zod_1.z.number().positive().optional(),
    bannerUrl: zod_1.z.string().url().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional()
});
exports.updateOfferSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(1000).optional(),
    discountPercent: zod_1.z.number().int().min(1).max(100).optional(),
    gemsRequired: zod_1.z.number().int().min(1).optional(),
    location: locationSchema.optional(),
    radiusKm: zod_1.z.number().positive().optional(),
    bannerUrl: zod_1.z.string().url().optional(),
    status: zod_1.z.enum(['active', 'paused', 'expired']).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional()
});
//# sourceMappingURL=partners.validators.js.map