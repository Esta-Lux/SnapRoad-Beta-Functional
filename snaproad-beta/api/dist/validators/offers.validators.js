"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemOfferSchema = void 0;
const zod_1 = require("zod");
exports.redeemOfferSchema = zod_1.z.object({
    // Location for verification (optional)
    location: zod_1.z.object({
        lat: zod_1.z.number().min(-90).max(90),
        lng: zod_1.z.number().min(-180).max(180)
    }).optional()
});
//# sourceMappingURL=offers.validators.js.map