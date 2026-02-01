import { Request, Response, NextFunction } from 'express';
/**
 * Create incident report
 */
export declare const createIncident: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Upload incident photos (with auto-blur)
 */
export declare const uploadIncidentPhotos: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get incidents with geofencing
 */
export declare const getIncidents: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get nearby incidents
 */
export declare const getNearbyIncidents: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get incident details
 */
export declare const getIncidentDetails: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Delete incident
 */
export declare const deleteIncident: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=incidents.controller.d.ts.map