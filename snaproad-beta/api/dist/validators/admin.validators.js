"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePartnerStatusSchema = exports.adjustRewardsSchema = exports.moderateIncidentSchema = void 0;
const zod_1 = require("zod");
exports.moderateIncidentSchema = zod_1.z.object({
    action: zod_1.z.enum(['approve', 'reject', 'flag']),
    notes: zod_1.z.string().max(1000).optional()
});
exports.adjustRewardsSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    gemsAmount: zod_1.z.number().int(), // Can be positive or negative
    reason: zod_1.z.string().min(1, 'Reason is required').max(500)
});
exports.updatePartnerStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'active', 'suspended']),
    reason: zod_1.z.string().max(500).optional()
});
//# sourceMappingURL=admin.validators.js.map