import { Router } from 'express';
import * as offersController from '../controllers/offers.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { redeemOfferSchema } from '../validators/offers.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/offers/nearby
 * @desc    Get offers near user location
 * @access  Private
 */
router.get('/nearby', offersController.getNearbyOffers);

/**
 * @route   GET /api/v1/offers
 * @desc    Get all available offers
 * @access  Private
 */
router.get('/', offersController.getAllOffers);

/**
 * @route   GET /api/v1/offers/:id
 * @desc    Get offer details
 * @access  Private
 */
router.get('/:id', offersController.getOfferDetails);

/**
 * @route   POST /api/v1/offers/:id/redeem
 * @desc    Redeem an offer with Gems
 * @access  Private
 */
router.post('/:id/redeem', validateRequest(redeemOfferSchema), offersController.redeemOffer);

/**
 * @route   GET /api/v1/offers/redemptions/history
 * @desc    Get user's redemption history
 * @access  Private
 */
router.get('/redemptions/history', offersController.getRedemptionHistory);

export default router;
