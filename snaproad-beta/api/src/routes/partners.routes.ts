import { Router } from 'express';
import * as partnersController from '../controllers/partners.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { registerPartnerSchema, createOfferSchema, updateOfferSchema } from '../validators/partners.validators';

const router = Router();

/**
 * @route   POST /api/v1/partners/register
 * @desc    Register as a business partner
 * @access  Public
 */
router.post('/register', validateRequest(registerPartnerSchema), partnersController.registerPartner);

// Protected routes
router.use(authenticate);

/**
 * @route   GET /api/v1/partners/profile
 * @desc    Get partner profile
 * @access  Private (Partner)
 */
router.get('/profile', partnersController.getPartnerProfile);

/**
 * @route   POST /api/v1/partners/offers
 * @desc    Create a new offer
 * @access  Private (Partner)
 */
router.post('/offers', validateRequest(createOfferSchema), partnersController.createOffer);

/**
 * @route   GET /api/v1/partners/offers
 * @desc    Get partner's offers
 * @access  Private (Partner)
 */
router.get('/offers', partnersController.getPartnerOffers);

/**
 * @route   PUT /api/v1/partners/offers/:id
 * @desc    Update an offer
 * @access  Private (Partner)
 */
router.put('/offers/:id', validateRequest(updateOfferSchema), partnersController.updateOffer);

/**
 * @route   DELETE /api/v1/partners/offers/:id
 * @desc    Delete an offer
 * @access  Private (Partner)
 */
router.delete('/offers/:id', partnersController.deleteOffer);

/**
 * @route   GET /api/v1/partners/analytics
 * @desc    Get partner analytics (redemptions, views, etc.)
 * @access  Private (Partner)
 */
router.get('/analytics', partnersController.getPartnerAnalytics);

/**
 * @route   GET /api/v1/partners/redemptions
 * @desc    Get redemption tracking
 * @access  Private (Partner)
 */
router.get('/redemptions', partnersController.getRedemptions);

export default router;
