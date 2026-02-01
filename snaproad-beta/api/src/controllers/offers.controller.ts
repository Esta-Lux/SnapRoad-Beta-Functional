import { Request, Response, NextFunction } from 'express';
import * as offersService from '../services/offers.service';
import { ApiResponse } from '../utils/response';

/**
 * Get nearby offers
 */
export const getNearbyOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, radiusKm = 25 } = req.query;
    
    // TODO: Implement geospatial query for nearby offers
    const offers = await offersService.getNearbyOffers({
      latitude: Number(lat),
      longitude: Number(lng),
      radiusKm: Number(radiusKm)
    });
    
    return ApiResponse.success(res, offers);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available offers
 */
export const getAllOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    
    const offers = await offersService.getAllOffers({
      page: Number(page),
      limit: Number(limit),
      category: category as string
    });
    
    return ApiResponse.success(res, offers);
  } catch (error) {
    next(error);
  }
};

/**
 * Get offer details
 */
export const getOfferDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const offer = await offersService.getOfferById(id);
    
    return ApiResponse.success(res, offer);
  } catch (error) {
    next(error);
  }
};

/**
 * Redeem offer with Gems
 */
export const redeemOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    // TODO: Implement offer redemption
    // - Check Gems balance
    // - Deduct Gems
    // - Generate redemption code
    // - Track platform fee
    const redemption = await offersService.redeemOffer(id, userId);
    
    return ApiResponse.created(res, redemption, 'Offer redeemed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get redemption history
 */
export const getRedemptionHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20 } = req.query;
    
    const redemptions = await offersService.getUserRedemptions(userId, {
      page: Number(page),
      limit: Number(limit)
    });
    
    return ApiResponse.success(res, redemptions);
  } catch (error) {
    next(error);
  }
};
