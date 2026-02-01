import { Request, Response, NextFunction } from 'express';
/**
 * Get nearby offers
 */
export declare const getNearbyOffers: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all available offers
 */
export declare const getAllOffers: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get offer details
 */
export declare const getOfferDetails: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Redeem offer with Gems
 */
export declare const redeemOffer: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get redemption history
 */
export declare const getRedemptionHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=offers.controller.d.ts.map