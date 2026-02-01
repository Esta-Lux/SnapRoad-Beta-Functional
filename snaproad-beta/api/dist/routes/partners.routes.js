"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const partnersController = __importStar(require("../controllers/partners.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const partners_validators_1 = require("../validators/partners.validators");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/partners/register
 * @desc    Register as a business partner
 * @access  Public
 */
router.post('/register', (0, validation_middleware_1.validateRequest)(partners_validators_1.registerPartnerSchema), partnersController.registerPartner);
// Protected routes
router.use(auth_middleware_1.authenticate);
/**
 * @route   GET /api/v1/partners/profile
 * @desc    Get partner profile
 * @access  Private (Partner)
 */
router.get('/profile', partnersController.getPartnerProfile);
/**
 * @route   POST /api/v1/partners/offers
 * @desc    Create a new offer
 * @access  Private (Partner)
 */
router.post('/offers', (0, validation_middleware_1.validateRequest)(partners_validators_1.createOfferSchema), partnersController.createOffer);
/**
 * @route   GET /api/v1/partners/offers
 * @desc    Get partner's offers
 * @access  Private (Partner)
 */
router.get('/offers', partnersController.getPartnerOffers);
/**
 * @route   PUT /api/v1/partners/offers/:id
 * @desc    Update an offer
 * @access  Private (Partner)
 */
router.put('/offers/:id', (0, validation_middleware_1.validateRequest)(partners_validators_1.updateOfferSchema), partnersController.updateOffer);
/**
 * @route   DELETE /api/v1/partners/offers/:id
 * @desc    Delete an offer
 * @access  Private (Partner)
 */
router.delete('/offers/:id', partnersController.deleteOffer);
/**
 * @route   GET /api/v1/partners/analytics
 * @desc    Get partner analytics (redemptions, views, etc.)
 * @access  Private (Partner)
 */
router.get('/analytics', partnersController.getPartnerAnalytics);
/**
 * @route   GET /api/v1/partners/redemptions
 * @desc    Get redemption tracking
 * @access  Private (Partner)
 */
router.get('/redemptions', partnersController.getRedemptions);
exports.default = router;
//# sourceMappingURL=partners.routes.js.map