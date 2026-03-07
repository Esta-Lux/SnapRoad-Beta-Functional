import { Request, Response, NextFunction } from 'express';
import * as partnersService from '../services/partners.service';
import { ApiResponse } from '../utils/response';

/**
 * Register as business partner
 */
export const registerPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessName, contactEmail, contactPhone, subscriptionPlan } = req.body;
    
    // TODO: Implement partner registration
    // - Create partner record
    // - Set up Stripe subscription
    const partner = await partnersService.registerPartner({
      businessName,
      contactEmail,
      contactPhone,
      subscriptionPlan
    });
    
    return ApiResponse.created(res, partner, 'Partner registration submitted');
  } catch (error) {
    next(error);
  }
};

/**
 * Get partner profile
 */
export const getPartnerProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    
    const profile = await partnersService.getPartnerProfile(userId);
    
    return ApiResponse.success(res, profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Create offer
 */
export const createOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const offerData = req.body;
    
    const offer = await partnersService.createOffer(userId, offerData);
    
    return ApiResponse.created(res, offer, 'Offer created');
  } catch (error) {
    next(error);
  }
};

/**
 * Get partner offers
 */
export const getPartnerOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { status } = req.query;
    
    const offers = await partnersService.getPartnerOffers(userId, status as string);
    
    return ApiResponse.success(res, offers);
  } catch (error) {
    next(error);
  }
};

/**
 * Update offer
 */
export const updateOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const updateData = req.body;
    
    const offer = await partnersService.updateOffer(id, userId, updateData);
    
    return ApiResponse.success(res, offer, 'Offer updated');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete offer
 */
export const deleteOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    await partnersService.deleteOffer(id, userId);
    
    return ApiResponse.success(res, null, 'Offer deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * Get partner analytics
 */
export const getPartnerAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { startDate, endDate } = req.query;
    
    const analytics = await partnersService.getPartnerAnalytics(userId, {
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    return ApiResponse.success(res, analytics);
  } catch (error) {
    next(error);
  }
};

/**
 * Get redemptions
 */
export const getRedemptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20 } = req.query;
    
    const redemptions = await partnersService.getPartnerRedemptions(userId, {
      page: Number(page),
      limit: Number(limit)
    });
    
    return ApiResponse.success(res, redemptions);
  } catch (error) {
    next(error);
  }
};
