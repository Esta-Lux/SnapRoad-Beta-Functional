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
const offersController = __importStar(require("../controllers/offers.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const offers_validators_1 = require("../validators/offers.validators");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
/**
 * @route   GET /api/v1/offers/nearby
 * @desc    Get offers near user location
 * @access  Private
 */
router.get('/nearby', offersController.getNearbyOffers);
/**
 * @route   GET /api/v1/offers
 * @desc    Get all available offers
 * @access  Private
 */
router.get('/', offersController.getAllOffers);
/**
 * @route   GET /api/v1/offers/:id
 * @desc    Get offer details
 * @access  Private
 */
router.get('/:id', offersController.getOfferDetails);
/**
 * @route   POST /api/v1/offers/:id/redeem
 * @desc    Redeem an offer with Gems
 * @access  Private
 */
router.post('/:id/redeem', (0, validation_middleware_1.validateRequest)(offers_validators_1.redeemOfferSchema), offersController.redeemOffer);
/**
 * @route   GET /api/v1/offers/redemptions/history
 * @desc    Get user's redemption history
 * @access  Private
 */
router.get('/redemptions/history', offersController.getRedemptionHistory);
exports.default = router;
//# sourceMappingURL=offers.routes.js.map