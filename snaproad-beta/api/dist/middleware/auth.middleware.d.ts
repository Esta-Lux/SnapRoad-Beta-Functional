import { Request, Response, NextFunction } from 'express';
/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Admin role middleware
 * Requires user to have admin role
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Partner role middleware
 * Requires user to be a business partner
 */
export declare const requirePartner: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map