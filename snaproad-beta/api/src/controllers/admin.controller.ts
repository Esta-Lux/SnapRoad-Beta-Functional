import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import { ApiResponse } from '../utils/response';

// ==================== User Management ====================

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    const users = await adminService.listUsers({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      status: status as string
    });
    
    return ApiResponse.success(res, users);
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await adminService.getUserDetails(id);
    return ApiResponse.success(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const result = await adminService.updateUserStatus(id, status, reason);
    return ApiResponse.success(res, result, 'User status updated');
  } catch (error) {
    next(error);
  }
};

// ==================== Trip Management ====================

export const listTrips = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, userId, status, startDate, endDate } = req.query;
    
    const trips = await adminService.listTrips({
      page: Number(page),
      limit: Number(limit),
      userId: userId as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    return ApiResponse.success(res, trips);
  } catch (error) {
    next(error);
  }
};

export const getTripDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const trip = await adminService.getTripDetails(id);
    return ApiResponse.success(res, trip);
  } catch (error) {
    next(error);
  }
};

export const getActiveTrips = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await adminService.getActiveTrips();
    return ApiResponse.success(res, trips);
  } catch (error) {
    next(error);
  }
};

// ==================== Incident Moderation ====================

export const getIncidentQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    
    const incidents = await adminService.getIncidentQueue({
      page: Number(page),
      limit: Number(limit),
      status: status as string
    });
    
    return ApiResponse.success(res, incidents);
  } catch (error) {
    next(error);
  }
};

export const moderateIncident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { id } = req.params;
    const { action, notes } = req.body; // action: approve, reject, flag
    
    const result = await adminService.moderateIncident(id, adminId, action, notes);
    
    return ApiResponse.success(res, result, `Incident ${action}d`);
  } catch (error) {
    next(error);
  }
};

export const getIncidentAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const analytics = await adminService.getIncidentAnalytics({
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    return ApiResponse.success(res, analytics);
  } catch (error) {
    next(error);
  }
};

// ==================== Rewards Management ====================

export const getRewardsMonitoring = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = '7d' } = req.query;
    const data = await adminService.getRewardsMonitoring(period as string);
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
};

export const adjustRewards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { userId, gemsAmount, reason } = req.body;
    
    const result = await adminService.adjustRewards(adminId, userId, gemsAmount, reason);
    
    return ApiResponse.success(res, result, 'Rewards adjusted');
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'weekly', limit = 100 } = req.query;
    const leaderboard = await adminService.getLeaderboard(period as string, Number(limit));
    return ApiResponse.success(res, leaderboard);
  } catch (error) {
    next(error);
  }
};

export const resetLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { period } = req.body;
    
    await adminService.resetLeaderboard(adminId, period);
    
    return ApiResponse.success(res, null, 'Leaderboard reset');
  } catch (error) {
    next(error);
  }
};

// ==================== Partner Management ====================

export const listPartners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const partners = await adminService.listPartners({
      page: Number(page),
      limit: Number(limit),
      status: status as string
    });
    
    return ApiResponse.success(res, partners);
  } catch (error) {
    next(error);
  }
};

export const getPartnerDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const partner = await adminService.getPartnerDetails(id);
    return ApiResponse.success(res, partner);
  } catch (error) {
    next(error);
  }
};

export const updatePartnerStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { id } = req.params;
    const { status, reason } = req.body;
    
    const result = await adminService.updatePartnerStatus(id, adminId, status, reason);
    
    return ApiResponse.success(res, result, 'Partner status updated');
  } catch (error) {
    next(error);
  }
};

export const getPartnerOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const offers = await adminService.getPartnerOffers(id);
    return ApiResponse.success(res, offers);
  } catch (error) {
    next(error);
  }
};

export const getFinancialSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await adminService.getFinancialSummary({
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    return ApiResponse.success(res, summary);
  } catch (error) {
    next(error);
  }
};

// ==================== Dashboard & Analytics ====================

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await adminService.getDashboard();
    return ApiResponse.success(res, dashboard);
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metric, period, startDate, endDate } = req.query;
    
    const analytics = await adminService.getAnalytics({
      metric: metric as string,
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    return ApiResponse.success(res, analytics);
  } catch (error) {
    next(error);
  }
};
