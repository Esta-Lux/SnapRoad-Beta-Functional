import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { moderateIncidentSchema, adjustRewardsSchema, updatePartnerStatusSchema } from '../validators/admin.validators';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

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
router.put('/incidents/:id', validateRequest(moderateIncidentSchema), adminController.moderateIncident);

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
router.post('/rewards/adjust', validateRequest(adjustRewardsSchema), adminController.adjustRewards);

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
router.put('/partners/:id/status', validateRequest(updatePartnerStatusSchema), adminController.updatePartnerStatus);

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

export default router;
