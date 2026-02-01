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
exports.getAnalytics = exports.getDashboard = exports.getFinancialSummary = exports.getPartnerOffers = exports.updatePartnerStatus = exports.getPartnerDetails = exports.listPartners = exports.resetLeaderboard = exports.getLeaderboard = exports.adjustRewards = exports.getRewardsMonitoring = exports.getIncidentAnalytics = exports.moderateIncident = exports.getIncidentQueue = exports.getActiveTrips = exports.getTripDetails = exports.listTrips = exports.updateUserStatus = exports.getUserDetails = exports.listUsers = void 0;
const adminService = __importStar(require("../services/admin.service"));
const response_1 = require("../utils/response");
// ==================== User Management ====================
const listUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const users = await adminService.listUsers({
            page: Number(page),
            limit: Number(limit),
            search: search,
            status: status
        });
        return response_1.ApiResponse.success(res, users);
    }
    catch (error) {
        next(error);
    }
};
exports.listUsers = listUsers;
const getUserDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await adminService.getUserDetails(id);
        return response_1.ApiResponse.success(res, user);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserDetails = getUserDetails;
const updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const result = await adminService.updateUserStatus(id, status, reason);
        return response_1.ApiResponse.success(res, result, 'User status updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateUserStatus = updateUserStatus;
// ==================== Trip Management ====================
const listTrips = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, userId, status, startDate, endDate } = req.query;
        const trips = await adminService.listTrips({
            page: Number(page),
            limit: Number(limit),
            userId: userId,
            status: status,
            startDate: startDate,
            endDate: endDate
        });
        return response_1.ApiResponse.success(res, trips);
    }
    catch (error) {
        next(error);
    }
};
exports.listTrips = listTrips;
const getTripDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const trip = await adminService.getTripDetails(id);
        return response_1.ApiResponse.success(res, trip);
    }
    catch (error) {
        next(error);
    }
};
exports.getTripDetails = getTripDetails;
const getActiveTrips = async (req, res, next) => {
    try {
        const trips = await adminService.getActiveTrips();
        return response_1.ApiResponse.success(res, trips);
    }
    catch (error) {
        next(error);
    }
};
exports.getActiveTrips = getActiveTrips;
// ==================== Incident Moderation ====================
const getIncidentQueue = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status = 'pending' } = req.query;
        const incidents = await adminService.getIncidentQueue({
            page: Number(page),
            limit: Number(limit),
            status: status
        });
        return response_1.ApiResponse.success(res, incidents);
    }
    catch (error) {
        next(error);
    }
};
exports.getIncidentQueue = getIncidentQueue;
const moderateIncident = async (req, res, next) => {
    try {
        const adminId = req.userId;
        const { id } = req.params;
        const { action, notes } = req.body; // action: approve, reject, flag
        const result = await adminService.moderateIncident(id, adminId, action, notes);
        return response_1.ApiResponse.success(res, result, `Incident ${action}d`);
    }
    catch (error) {
        next(error);
    }
};
exports.moderateIncident = moderateIncident;
const getIncidentAnalytics = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const analytics = await adminService.getIncidentAnalytics({
            startDate: startDate,
            endDate: endDate
        });
        return response_1.ApiResponse.success(res, analytics);
    }
    catch (error) {
        next(error);
    }
};
exports.getIncidentAnalytics = getIncidentAnalytics;
// ==================== Rewards Management ====================
const getRewardsMonitoring = async (req, res, next) => {
    try {
        const { period = '7d' } = req.query;
        const data = await adminService.getRewardsMonitoring(period);
        return response_1.ApiResponse.success(res, data);
    }
    catch (error) {
        next(error);
    }
};
exports.getRewardsMonitoring = getRewardsMonitoring;
const adjustRewards = async (req, res, next) => {
    try {
        const adminId = req.userId;
        const { userId, gemsAmount, reason } = req.body;
        const result = await adminService.adjustRewards(adminId, userId, gemsAmount, reason);
        return response_1.ApiResponse.success(res, result, 'Rewards adjusted');
    }
    catch (error) {
        next(error);
    }
};
exports.adjustRewards = adjustRewards;
const getLeaderboard = async (req, res, next) => {
    try {
        const { period = 'weekly', limit = 100 } = req.query;
        const leaderboard = await adminService.getLeaderboard(period, Number(limit));
        return response_1.ApiResponse.success(res, leaderboard);
    }
    catch (error) {
        next(error);
    }
};
exports.getLeaderboard = getLeaderboard;
const resetLeaderboard = async (req, res, next) => {
    try {
        const adminId = req.userId;
        const { period } = req.body;
        await adminService.resetLeaderboard(adminId, period);
        return response_1.ApiResponse.success(res, null, 'Leaderboard reset');
    }
    catch (error) {
        next(error);
    }
};
exports.resetLeaderboard = resetLeaderboard;
// ==================== Partner Management ====================
const listPartners = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const partners = await adminService.listPartners({
            page: Number(page),
            limit: Number(limit),
            status: status
        });
        return response_1.ApiResponse.success(res, partners);
    }
    catch (error) {
        next(error);
    }
};
exports.listPartners = listPartners;
const getPartnerDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const partner = await adminService.getPartnerDetails(id);
        return response_1.ApiResponse.success(res, partner);
    }
    catch (error) {
        next(error);
    }
};
exports.getPartnerDetails = getPartnerDetails;
const updatePartnerStatus = async (req, res, next) => {
    try {
        const adminId = req.userId;
        const { id } = req.params;
        const { status, reason } = req.body;
        const result = await adminService.updatePartnerStatus(id, adminId, status, reason);
        return response_1.ApiResponse.success(res, result, 'Partner status updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updatePartnerStatus = updatePartnerStatus;
const getPartnerOffers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const offers = await adminService.getPartnerOffers(id);
        return response_1.ApiResponse.success(res, offers);
    }
    catch (error) {
        next(error);
    }
};
exports.getPartnerOffers = getPartnerOffers;
const getFinancialSummary = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const summary = await adminService.getFinancialSummary({
            startDate: startDate,
            endDate: endDate
        });
        return response_1.ApiResponse.success(res, summary);
    }
    catch (error) {
        next(error);
    }
};
exports.getFinancialSummary = getFinancialSummary;
// ==================== Dashboard & Analytics ====================
const getDashboard = async (req, res, next) => {
    try {
        const dashboard = await adminService.getDashboard();
        return response_1.ApiResponse.success(res, dashboard);
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboard = getDashboard;
const getAnalytics = async (req, res, next) => {
    try {
        const { metric, period, startDate, endDate } = req.query;
        const analytics = await adminService.getAnalytics({
            metric: metric,
            period: period,
            startDate: startDate,
            endDate: endDate
        });
        return response_1.ApiResponse.success(res, analytics);
    }
    catch (error) {
        next(error);
    }
};
exports.getAnalytics = getAnalytics;
//# sourceMappingURL=admin.controller.js.map