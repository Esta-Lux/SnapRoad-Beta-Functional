import { Router } from 'express';
import * as rewardsController from '../controllers/rewards.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

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

export default router;
