import { Request, Response, NextFunction } from 'express';
import * as vehiclesService from '../services/vehicles.service';
import { ApiResponse } from '../utils/response';

/**
 * Create vehicle
 */
export const createVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { make, model, year, fuelType, isPrimary } = req.body;
    
    const vehicle = await vehiclesService.createVehicle({
      userId,
      make,
      model,
      year,
      fuelType,
      isPrimary
    });
    
    return ApiResponse.created(res, vehicle, 'Vehicle added');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user vehicles
 */
export const getVehicles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    
    const vehicles = await vehiclesService.getUserVehicles(userId);
    
    return ApiResponse.success(res, vehicles);
  } catch (error) {
    next(error);
  }
};

/**
 * Get vehicle details
 */
export const getVehicleDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const vehicle = await vehiclesService.getVehicleById(id, userId);
    
    return ApiResponse.success(res, vehicle);
  } catch (error) {
    next(error);
  }
};

/**
 * Update vehicle
 */
export const updateVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const updateData = req.body;
    
    const vehicle = await vehiclesService.updateVehicle(id, userId, updateData);
    
    return ApiResponse.success(res, vehicle, 'Vehicle updated');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete vehicle
 */
export const deleteVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    await vehiclesService.deleteVehicle(id, userId);
    
    return ApiResponse.success(res, null, 'Vehicle deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * Set primary vehicle
 */
export const setPrimaryVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    const vehicle = await vehiclesService.setPrimaryVehicle(id, userId);
    
    return ApiResponse.success(res, vehicle, 'Primary vehicle updated');
  } catch (error) {
    next(error);
  }
};
