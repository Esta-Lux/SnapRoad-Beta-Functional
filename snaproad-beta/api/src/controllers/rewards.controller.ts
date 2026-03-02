import { Request, Response, NextFunction } from 'express';
import * as rewardsService from '../services/rewards.service';
import { ApiResponse } from '../utils/response';

/**
 * Get rewards summary
 */
export const getRewardsSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    
    // TODO: Implement rewards summary
    // - Gems balance
    // - Current driving score
    // - Total Gems earned
    // - Season progress
    const summary = await rewardsService.getUserRewardsSummary(userId);
    
    return ApiResponse.success(res, summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction history
 */
export const getTransactionHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20, type } = req.query;
    
    const transactions = await rewardsService.getTransactionHistory(userId, {
      page: Number(page),
      limit: Number(limit),
      type: type as string
    });
    
    return ApiResponse.success(res, transactions);
  } catch (error) {
    next(error);
  }
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { period = 'weekly', limit = 50 } = req.query;
    
    // TODO: Implement leaderboard with Redis caching
    const leaderboard = await rewardsService.getLeaderboard({
      userId,
      period: period as 'weekly' | 'seasonal',
      limit: Number(limit)
    });
    
    return ApiResponse.success(res, leaderboard);
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekly summary
 */
export const getWeeklySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    
    // TODO: Implement weekly summary
    // - Trips count
    // - Total distance
    // - Gems earned
    // - Average driving score
    const summary = await rewardsService.getWeeklySummary(userId);
    
    return ApiResponse.success(res, summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Get streaks
 */
export const getStreaks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    
    const streaks = await rewardsService.getUserStreaks(userId);
    
    return ApiResponse.success(res, streaks);
  } catch (error) {
    next(error);
  }
};
