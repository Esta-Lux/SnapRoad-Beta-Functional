import { Request, Response, NextFunction } from 'express';
import * as tripsService from '../services/trips.service';
import { ApiResponse } from '../utils/response';

/**
 * Start a new trip
 */
export const startTrip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { vehicleId, startLocation, destination } = req.body;
    
    // TODO: Implement trip start logic
    // - Create trip record
    // - Get optimized route from Mapbox
    // - Initialize real-time tracking
    const trip = await tripsService.startNewTrip({
      userId,
      vehicleId,
      startLocation,
      destination
    });
    
    return ApiResponse.created(res, trip, 'Trip started');
  } catch (error) {
    next(error);
  }
};

/**
 * End a trip
 */
export const endTrip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { endLocation, routeGeometry } = req.body;
    
    // TODO: Implement trip end logic
    // - Calculate driving score
    // - Calculate fuel savings
    // - Award Gems
    const tripSummary = await tripsService.endTrip({
      tripId: id,
      userId,
      endLocation,
      routeGeometry
    });
    
    return ApiResponse.success(res, tripSummary, 'Trip completed');
  } catch (error) {
    next(error);
  }
};

/**
 * Get trip history
 */
export const getTripHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20 } = req.query;
    
    const trips = await tripsService.getUserTrips(userId, {
      page: Number(page),
      limit: Number(limit)
    });
    
    return ApiResponse.success(res, trips);
  } catch (error) {
    next(error);
  }
};

/**
 * Get trip details
 */
export const getTripDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const trip = await tripsService.getTripById(id, userId);
    
    return ApiResponse.success(res, trip);
  } catch (error) {
    next(error);
  }
};

/**
 * Log driving event
 */
export const logTripEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { eventType, severity, location, speedKmh } = req.body;
    
    // TODO: Implement event logging
    // Event types: speeding, hard_brake, rapid_acceleration
    const event = await tripsService.logDrivingEvent({
      tripId: id,
      eventType,
      severity,
      location,
      speedKmh
    });
    
    return ApiResponse.created(res, event, 'Event logged');
  } catch (error) {
    next(error);
  }
};

/**
 * Get trip events
 */
export const getTripEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const events = await tripsService.getTripEvents(id);
    
    return ApiResponse.success(res, events);
  } catch (error) {
    next(error);
  }
};

/**
 * Get active trip
 */
export const getActiveTrip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    
    const activeTrip = await tripsService.getActiveTrip(userId);
    
    return ApiResponse.success(res, activeTrip);
  } catch (error) {
    next(error);
  }
};
