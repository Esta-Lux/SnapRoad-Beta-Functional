/**
 * Driving event types and their penalties
 */
interface DrivingEvent {
    eventType: 'speeding' | 'hard_brake' | 'rapid_acceleration';
    severity: 'low' | 'medium' | 'high';
}
/**
 * Calculate driving score based on events
 * @param distanceKm - Trip distance in kilometers
 * @param durationMinutes - Trip duration in minutes
 * @param events - Array of driving events
 * @returns Score between 0-100
 */
export declare const calculateDrivingScore: (distanceKm: number, durationMinutes: number, events: DrivingEvent[]) => number;
/**
 * Calculate Gems earned from a trip
 * @param drivingScore - Score from 0-100
 * @param distanceKm - Trip distance
 * @param subscriptionTier - User's subscription tier
 * @returns Number of Gems earned
 */
export declare const calculateGemsEarned: (drivingScore: number, distanceKm: number, subscriptionTier: "free" | "premium" | "family") => number;
export declare const getUserRewardsSummary: (userId: string) => Promise<never>;
export declare const getTransactionHistory: (userId: string, options: {
    page: number;
    limit: number;
    type?: string;
}) => Promise<never>;
export declare const getLeaderboard: (options: {
    userId: string;
    period: "weekly" | "seasonal";
    limit: number;
}) => Promise<never>;
export declare const getWeeklySummary: (userId: string) => Promise<never>;
export declare const getUserStreaks: (userId: string) => Promise<never>;
export declare const awardGems: (userId: string, amount: number, source: string, referenceId?: string) => Promise<never>;
export declare const deductGems: (userId: string, amount: number, source: string, referenceId?: string) => Promise<never>;
export {};
//# sourceMappingURL=rewards.service.d.ts.map