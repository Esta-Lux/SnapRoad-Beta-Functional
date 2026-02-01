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
exports.getStreaks = exports.getWeeklySummary = exports.getLeaderboard = exports.getTransactionHistory = exports.getRewardsSummary = void 0;
const rewardsService = __importStar(require("../services/rewards.service"));
const response_1 = require("../utils/response");
/**
 * Get rewards summary
 */
const getRewardsSummary = async (req, res, next) => {
    try {
        const userId = req.userId;
        // TODO: Implement rewards summary
        // - Gems balance
        // - Current driving score
        // - Total Gems earned
        // - Season progress
        const summary = await rewardsService.getUserRewardsSummary(userId);
        return response_1.ApiResponse.success(res, summary);
    }
    catch (error) {
        next(error);
    }
};
exports.getRewardsSummary = getRewardsSummary;
/**
 * Get transaction history
 */
const getTransactionHistory = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 20, type } = req.query;
        const transactions = await rewardsService.getTransactionHistory(userId, {
            page: Number(page),
            limit: Number(limit),
            type: type
        });
        return response_1.ApiResponse.success(res, transactions);
    }
    catch (error) {
        next(error);
    }
};
exports.getTransactionHistory = getTransactionHistory;
/**
 * Get leaderboard
 */
const getLeaderboard = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { period = 'weekly', limit = 50 } = req.query;
        // TODO: Implement leaderboard with Redis caching
        const leaderboard = await rewardsService.getLeaderboard({
            userId,
            period: period,
            limit: Number(limit)
        });
        return response_1.ApiResponse.success(res, leaderboard);
    }
    catch (error) {
        next(error);
    }
};
exports.getLeaderboard = getLeaderboard;
/**
 * Get weekly summary
 */
const getWeeklySummary = async (req, res, next) => {
    try {
        const userId = req.userId;
        // TODO: Implement weekly summary
        // - Trips count
        // - Total distance
        // - Gems earned
        // - Average driving score
        const summary = await rewardsService.getWeeklySummary(userId);
        return response_1.ApiResponse.success(res, summary);
    }
    catch (error) {
        next(error);
    }
};
exports.getWeeklySummary = getWeeklySummary;
/**
 * Get streaks
 */
const getStreaks = async (req, res, next) => {
    try {
        const userId = req.userId;
        const streaks = await rewardsService.getUserStreaks(userId);
        return response_1.ApiResponse.success(res, streaks);
    }
    catch (error) {
        next(error);
    }
};
exports.getStreaks = getStreaks;
//# sourceMappingURL=rewards.controller.js.map