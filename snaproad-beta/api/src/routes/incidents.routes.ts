import { Router } from 'express';
import * as incidentsController from '../controllers/incidents.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createIncidentSchema, uploadPhotoSchema } from '../validators/incidents.validators';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/incidents
 * @desc    Create a new incident report
 * @access  Private
 */
router.post('/', validateRequest(createIncidentSchema), incidentsController.createIncident);

/**
 * @route   POST /api/v1/incidents/:id/photos
 * @desc    Upload photos for an incident (with auto-blur)
 * @access  Private
 */
router.post(
  '/:id/photos',
  uploadMiddleware.array('photos', 5),
  incidentsController.uploadIncidentPhotos
);

/**
 * @route   GET /api/v1/incidents
 * @desc    Get incidents (with geofencing)
 * @access  Private
 */
router.get('/', incidentsController.getIncidents);

/**
 * @route   GET /api/v1/incidents/nearby
 * @desc    Get incidents near a location
 * @access  Private
 */
router.get('/nearby', incidentsController.getNearbyIncidents);

/**
 * @route   GET /api/v1/incidents/:id
 * @desc    Get incident details
 * @access  Private
 */
router.get('/:id', incidentsController.getIncidentDetails);

/**
 * @route   DELETE /api/v1/incidents/:id
 * @desc    Delete own incident report
 * @access  Private
 */
router.delete('/:id', incidentsController.deleteIncident);

export default router;
