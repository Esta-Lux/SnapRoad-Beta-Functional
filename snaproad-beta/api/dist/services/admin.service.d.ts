export declare const listUsers: (options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
}) => Promise<never>;
export declare const getUserDetails: (userId: string) => Promise<never>;
export declare const updateUserStatus: (userId: string, status: string, reason?: string) => Promise<never>;
export declare const listTrips: (options: {
    page: number;
    limit: number;
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}) => Promise<never>;
export declare const getTripDetails: (tripId: string) => Promise<never>;
export declare const getActiveTrips: () => Promise<never>;
export declare const getIncidentQueue: (options: {
    page: number;
    limit: number;
    status: string;
}) => Promise<never>;
export declare const moderateIncident: (incidentId: string, adminId: string, action: "approve" | "reject" | "flag", notes?: string) => Promise<never>;
export declare const getIncidentAnalytics: (dateRange: {
    startDate?: string;
    endDate?: string;
}) => Promise<never>;
export declare const getRewardsMonitoring: (period: string) => Promise<never>;
export declare const adjustRewards: (adminId: string, userId: string, gemsAmount: number, reason: string) => Promise<never>;
export declare const getLeaderboard: (period: string, limit: number) => Promise<never>;
export declare const resetLeaderboard: (adminId: string, period: string) => Promise<never>;
export declare const listPartners: (options: {
    page: number;
    limit: number;
    status?: string;
}) => Promise<never>;
export declare const getPartnerDetails: (partnerId: string) => Promise<never>;
export declare const updatePartnerStatus: (partnerId: string, adminId: string, status: string, reason?: string) => Promise<never>;
export declare const getPartnerOffers: (partnerId: string) => Promise<never>;
export declare const getFinancialSummary: (dateRange: {
    startDate?: string;
    endDate?: string;
}) => Promise<never>;
export declare const getDashboard: () => Promise<never>;
export declare const getAnalytics: (options: {
    metric?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
}) => Promise<never>;
//# sourceMappingURL=admin.service.d.ts.map