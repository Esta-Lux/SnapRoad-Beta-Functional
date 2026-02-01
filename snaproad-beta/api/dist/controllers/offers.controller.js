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
exports.getRedemptionHistory = exports.redeemOffer = exports.getOfferDetails = exports.getAllOffers = exports.getNearbyOffers = void 0;
const offersService = __importStar(require("../services/offers.service"));
const response_1 = require("../utils/response");
/**
 * Get nearby offers
 */
const getNearbyOffers = async (req, res, next) => {
    try {
        const { lat, lng, radiusKm = 25 } = req.query;
        // TODO: Implement geospatial query for nearby offers
        const offers = await offersService.getNearbyOffers({
            latitude: Number(lat),
            longitude: Number(lng),
            radiusKm: Number(radiusKm)
        });
        return response_1.ApiResponse.success(res, offers);
    }
    catch (error) {
        next(error);
    }
};
exports.getNearbyOffers = getNearbyOffers;
/**
 * Get all available offers
 */
const getAllOffers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, category } = req.query;
        const offers = await offersService.getAllOffers({
            page: Number(page),
            limit: Number(limit),
            category: category
        });
        return response_1.ApiResponse.success(res, offers);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllOffers = getAllOffers;
/**
 * Get offer details
 */
const getOfferDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const offer = await offersService.getOfferById(id);
        return response_1.ApiResponse.success(res, offer);
    }
    catch (error) {
        next(error);
    }
};
exports.getOfferDetails = getOfferDetails;
/**
 * Redeem offer with Gems
 */
const redeemOffer = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // TODO: Implement offer redemption
        // - Check Gems balance
        // - Deduct Gems
        // - Generate redemption code
        // - Track platform fee
        const redemption = await offersService.redeemOffer(id, userId);
        return response_1.ApiResponse.created(res, redemption, 'Offer redeemed successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.redeemOffer = redeemOffer;
/**
 * Get redemption history
 */
const getRedemptionHistory = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 20 } = req.query;
        const redemptions = await offersService.getUserRedemptions(userId, {
            page: Number(page),
            limit: Number(limit)
        });
        return response_1.ApiResponse.success(res, redemptions);
    }
    catch (error) {
        next(error);
    }
};
exports.getRedemptionHistory = getRedemptionHistory;
//# sourceMappingURL=offers.controller.js.map