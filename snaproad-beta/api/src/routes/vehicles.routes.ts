import { Router } from 'express';
import * as vehiclesController from '../controllers/vehicles.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createVehicleSchema, updateVehicleSchema } from '../validators/vehicles.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/vehicles
 * @desc    Add a new vehicle
 * @access  Private
 */
router.post('/', validateRequest(createVehicleSchema), vehiclesController.createVehicle);

/**
 * @route   GET /api/v1/vehicles
 * @desc    Get user's vehicles
 * @access  Private
 */
router.get('/', vehiclesController.getVehicles);

/**
 * @route   GET /api/v1/vehicles/:id
 * @desc    Get vehicle details
 * @access  Private
 */
router.get('/:id', vehiclesController.getVehicleDetails);

/**
 * @route   PUT /api/v1/vehicles/:id
 * @desc    Update vehicle
 * @access  Private
 */
router.put('/:id', validateRequest(updateVehicleSchema), vehiclesController.updateVehicle);

/**
 * @route   DELETE /api/v1/vehicles/:id
 * @desc    Delete vehicle
 * @access  Private
 */
router.delete('/:id', vehiclesController.deleteVehicle);

/**
 * @route   PATCH /api/v1/vehicles/:id/primary
 * @desc    Set vehicle as primary
 * @access  Private
 */
router.patch('/:id/primary', vehiclesController.setPrimaryVehicle);

export default router;
