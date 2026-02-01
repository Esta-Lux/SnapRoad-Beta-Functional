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
exports.getRedemptions = exports.getPartnerAnalytics = exports.deleteOffer = exports.updateOffer = exports.getPartnerOffers = exports.createOffer = exports.getPartnerProfile = exports.registerPartner = void 0;
const partnersService = __importStar(require("../services/partners.service"));
const response_1 = require("../utils/response");
/**
 * Register as business partner
 */
const registerPartner = async (req, res, next) => {
    try {
        const { businessName, contactEmail, contactPhone, subscriptionPlan } = req.body;
        // TODO: Implement partner registration
        // - Create partner record
        // - Set up Stripe subscription
        const partner = await partnersService.registerPartner({
            businessName,
            contactEmail,
            contactPhone,
            subscriptionPlan
        });
        return response_1.ApiResponse.created(res, partner, 'Partner registration submitted');
    }
    catch (error) {
        next(error);
    }
};
exports.registerPartner = registerPartner;
/**
 * Get partner profile
 */
const getPartnerProfile = async (req, res, next) => {
    try {
        const userId = req.userId;
        const profile = await partnersService.getPartnerProfile(userId);
        return response_1.ApiResponse.success(res, profile);
    }
    catch (error) {
        next(error);
    }
};
exports.getPartnerProfile = getPartnerProfile;
/**
 * Create offer
 */
const createOffer = async (req, res, next) => {
    try {
        const userId = req.userId;
        const offerData = req.body;
        const offer = await partnersService.createOffer(userId, offerData);
        return response_1.ApiResponse.created(res, offer, 'Offer created');
    }
    catch (error) {
        next(error);
    }
};
exports.createOffer = createOffer;
/**
 * Get partner offers
 */
const getPartnerOffers = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { status } = req.query;
        const offers = await partnersService.getPartnerOffers(userId, status);
        return response_1.ApiResponse.success(res, offers);
    }
    catch (error) {
        next(error);
    }
};
exports.getPartnerOffers = getPartnerOffers;
/**
 * Update offer
 */
const updateOffer = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const updateData = req.body;
        const offer = await partnersService.updateOffer(id, userId, updateData);
        return response_1.ApiResponse.success(res, offer, 'Offer updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateOffer = updateOffer;
/**
 * Delete offer
 */
const deleteOffer = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        await partnersService.deleteOffer(id, userId);
        return response_1.ApiResponse.success(res, null, 'Offer deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteOffer = deleteOffer;
/**
 * Get partner analytics
 */
const getPartnerAnalytics = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { startDate, endDate } = req.query;
        const analytics = await partnersService.getPartnerAnalytics(userId, {
            startDate: startDate,
            endDate: endDate
        });
        return response_1.ApiResponse.success(res, analytics);
    }
    catch (error) {
        next(error);
    }
};
exports.getPartnerAnalytics = getPartnerAnalytics;
/**
 * Get redemptions
 */
const getRedemptions = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 20 } = req.query;
        const redemptions = await partnersService.getPartnerRedemptions(userId, {
            page: Number(page),
            limit: Number(limit)
        });
        return response_1.ApiResponse.success(res, redemptions);
    }
    catch (error) {
        next(error);
    }
};
exports.getRedemptions = getRedemptions;
//# sourceMappingURL=partners.controller.js.map