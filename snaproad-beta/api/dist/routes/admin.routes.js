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
const adminController = __importStar(require("../controllers/admin.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const admin_validators_1 = require("../validators/admin.validators");
const router = (0, express_1.Router)();
// All routes require admin authentication
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.requireAdmin);
// ==================== User Management ====================
/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users with pagination
 * @access  Admin
 */
router.get('/users', adminController.listUsers);
/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user details
 * @access  Admin
 */
router.get('/users/:id', adminController.getUserDetails);
/**
 * @route   PUT /api/v1/admin/users/:id/status
 * @desc    Update user status (active, suspended, etc.)
 * @access  Admin
 */
router.put('/users/:id/status', adminController.updateUserStatus);
// ==================== Trip Management ====================
/**
 * @route   GET /api/v1/admin/trips
 * @desc    List all trips with filters
 * @access  Admin
 */
router.get('/trips', adminController.listTrips);
/**
 * @route   GET /api/v1/admin/trips/:id
 * @desc    Get trip details with events
 * @access  Admin
 */
router.get('/trips/:id', adminController.getTripDetails);
/**
 * @route   GET /api/v1/admin/trips/active
 * @desc    Get all active trips (real-time monitoring)
 * @access  Admin
 */
router.get('/trips/status/active', adminController.getActiveTrips);
// ==================== Incident Moderation ====================
/**
 * @route   GET /api/v1/admin/incidents
 * @desc    Get incident moderation queue
 * @access  Admin
 */
router.get('/incidents', adminController.getIncidentQueue);
/**
 * @route   PUT /api/v1/admin/incidents/:id
 * @desc    Moderate incident (approve/reject/flag)
 * @access  Admin
 */
router.put('/incidents/:id', (0, validation_middleware_1.validateRequest)(admin_validators_1.moderateIncidentSchema), adminController.moderateIncident);
/**
 * @route   GET /api/v1/admin/incidents/analytics
 * @desc    Get incident analytics (count by type, region)
 * @access  Admin
 */
router.get('/incidents/analytics', adminController.getIncidentAnalytics);
// ==================== Rewards Management ====================
/**
 * @route   GET /api/v1/admin/rewards
 * @desc    Rewards monitoring dashboard
 * @access  Admin
 */
router.get('/rewards', adminController.getRewardsMonitoring);
/**
 * @route   POST /api/v1/admin/rewards/adjust
 * @desc    Manual reward adjustment
 * @access  Admin
 */
router.post('/rewards/adjust', (0, validation_middleware_1.validateRequest)(admin_validators_1.adjustRewardsSchema), adminController.adjustRewards);
/**
 * @route   GET /api/v1/admin/leaderboard
 * @desc    View/manage leaderboard
 * @access  Admin
 */
router.get('/leaderboard', adminController.getLeaderboard);
/**
 * @route   POST /api/v1/admin/leaderboard/reset
 * @desc    Reset seasonal leaderboard
 * @access  Admin (Super Admin)
 */
router.post('/leaderboard/reset', adminController.resetLeaderboard);
// ==================== Partner Management ====================
/**
 * @route   GET /api/v1/admin/partners
 * @desc    List all business partners
 * @access  Admin
 */
router.get('/partners', adminController.listPartners);
/**
 * @route   GET /api/v1/admin/partners/:id
 * @desc    Get partner details
 * @access  Admin
 */
router.get('/partners/:id', adminController.getPartnerDetails);
/**
 * @route   PUT /api/v1/admin/partners/:id/status
 * @desc    Update partner status (approve/suspend)
 * @access  Admin
 */
router.put('/partners/:id/status', (0, validation_middleware_1.validateRequest)(admin_validators_1.updatePartnerStatusSchema), adminController.updatePartnerStatus);
/**
 * @route   GET /api/v1/admin/partners/:id/offers
 * @desc    Get partner's offers
 * @access  Admin
 */
router.get('/partners/:id/offers', adminController.getPartnerOffers);
/**
 * @route   GET /api/v1/admin/financials
 * @desc    Financial summary (fees collected, etc.)
 * @access  Admin
 */
router.get('/financials', adminController.getFinancialSummary);
// ==================== Dashboard & Analytics ====================
/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard overview
 * @access  Admin
 */
router.get('/dashboard', adminController.getDashboard);
/**
 * @route   GET /api/v1/admin/analytics
 * @desc    Get detailed analytics
 * @access  Admin
 */
router.get('/analytics', adminController.getAnalytics);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map