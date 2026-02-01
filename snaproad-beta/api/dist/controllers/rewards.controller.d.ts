import { Request, Response, NextFunction } from 'express';
/**
 * Get rewards summary
 */
export declare const getRewardsSummary: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get transaction history
 */
export declare const getTransactionHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get leaderboard
 */
export declare const getLeaderboard: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get weekly summary
 */
export declare const getWeeklySummary: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get streaks
 */
export declare const getStreaks: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=rewards.controller.d.ts.map