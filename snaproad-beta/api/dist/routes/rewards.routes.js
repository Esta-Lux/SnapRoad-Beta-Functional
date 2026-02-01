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
const rewardsController = __importStar(require("../controllers/rewards.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
/**
 * @route   GET /api/v1/rewards
 * @desc    Get user rewards summary (Gems balance, score, etc.)
 * @access  Private
 */
router.get('/', rewardsController.getRewardsSummary);
/**
 * @route   GET /api/v1/rewards/transactions
 * @desc    Get reward transaction history
 * @access  Private
 */
router.get('/transactions', rewardsController.getTransactionHistory);
/**
 * @route   GET /api/v1/rewards/leaderboard
 * @desc    Get leaderboard (weekly/seasonal)
 * @access  Private
 */
router.get('/leaderboard', rewardsController.getLeaderboard);
/**
 * @route   GET /api/v1/rewards/weekly-summary
 * @desc    Get weekly summary (trips, distance, Gems earned)
 * @access  Private
 */
router.get('/weekly-summary', rewardsController.getWeeklySummary);
/**
 * @route   GET /api/v1/rewards/streaks
 * @desc    Get user streak information
 * @access  Private
 */
router.get('/streaks', rewardsController.getStreaks);
exports.default = router;
//# sourceMappingURL=rewards.routes.js.map