import { Request, Response, NextFunction } from 'express';
import * as incidentsService from '../services/incidents.service';
import { ApiResponse } from '../utils/response';

/**
 * Create incident report
 */
export const createIncident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { incidentType, description, location } = req.body;
    
    // TODO: Implement incident creation
    const incident = await incidentsService.createIncident({
      userId,
      incidentType,
      description,
      location
    });
    
    return ApiResponse.created(res, incident, 'Incident reported');
  } catch (error) {
    next(error);
  }
};

/**
 * Upload incident photos (with auto-blur)
 */
export const uploadIncidentPhotos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    
    // TODO: Implement photo upload with auto-blur
    // - Upload to S3
    // - Run AWS Rekognition for face/plate detection
    // - Apply blur using Sharp.js
    // - Save blurred version
    const photos = await incidentsService.uploadAndBlurPhotos(id, files);
    
    return ApiResponse.created(res, photos, 'Photos uploaded and processed');
  } catch (error) {
    next(error);
  }
};

/**
 * Get incidents with geofencing
 */
export const getIncidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    const incidents = await incidentsService.getIncidents({
      page: Number(page),
      limit: Number(limit),
      type: type as string,
      status: status as string
    });
    
    return ApiResponse.success(res, incidents);
  } catch (error) {
    next(error);
  }
};

/**
 * Get nearby incidents
 */
export const getNearbyIncidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, radiusKm = 10 } = req.query;
    
    // TODO: Implement geospatial query
    const incidents = await incidentsService.getNearbyIncidents({
      latitude: Number(lat),
      longitude: Number(lng),
      radiusKm: Number(radiusKm)
    });
    
    return ApiResponse.success(res, incidents);
  } catch (error) {
    next(error);
  }
};

/**
 * Get incident details
 */
export const getIncidentDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const incident = await incidentsService.getIncidentById(id);
    
    return ApiResponse.success(res, incident);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete incident
 */
export const deleteIncident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    await incidentsService.deleteIncident(id, userId);
    
    return ApiResponse.success(res, null, 'Incident deleted');
  } catch (error) {
    next(error);
  }
};
