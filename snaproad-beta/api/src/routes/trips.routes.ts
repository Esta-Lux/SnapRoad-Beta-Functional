import { Router } from 'express';
import * as tripsController from '../controllers/trips.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { startTripSchema, endTripSchema, tripEventSchema } from '../validators/trips.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/trips/start
 * @desc    Start a new trip
 * @access  Private
 */
router.post('/start', validateRequest(startTripSchema), tripsController.startTrip);

/**
 * @route   POST /api/v1/trips/:id/end
 * @desc    End a trip with summary
 * @access  Private
 */
router.post('/:id/end', validateRequest(endTripSchema), tripsController.endTrip);

/**
 * @route   GET /api/v1/trips
 * @desc    Get user trip history
 * @access  Private
 */
router.get('/', tripsController.getTripHistory);

/**
 * @route   GET /api/v1/trips/:id
 * @desc    Get trip details
 * @access  Private
 */
router.get('/:id', tripsController.getTripDetails);

/**
 * @route   POST /api/v1/trips/:id/events
 * @desc    Log driving events (speeding, hard brake, etc.)
 * @access  Private
 */
router.post('/:id/events', validateRequest(tripEventSchema), tripsController.logTripEvent);

/**
 * @route   GET /api/v1/trips/:id/events
 * @desc    Get all events for a trip
 * @access  Private
 */
router.get('/:id/events', tripsController.getTripEvents);

/**
 * @route   GET /api/v1/trips/active
 * @desc    Get user's active trip if any
 * @access  Private
 */
router.get('/status/active', tripsController.getActiveTrip);

export default router;
