import { Request, Response, NextFunction } from 'express';
/**
 * Create vehicle
 */
export declare const createVehicle: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user vehicles
 */
export declare const getVehicles: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get vehicle details
 */
export declare const getVehicleDetails: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update vehicle
 */
export declare const updateVehicle: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Delete vehicle
 */
export declare const deleteVehicle: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Set primary vehicle
 */
export declare const setPrimaryVehicle: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=vehicles.controller.d.ts.map