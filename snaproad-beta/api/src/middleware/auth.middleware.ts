import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/errors';

interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Token not provided');
    }
    
    // TODO: Implement with Supabase Auth or custom JWT verification
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;
    
    // Attach user info to request
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;
    (req as any).userRole = decoded.role;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Admin role middleware
 * Requires user to have admin role
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = (req as any).userRole;
    
    if (!userRole || !['admin', 'super_admin', 'moderator'].includes(userRole)) {
      throw new ApiError(403, 'Admin access required');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Partner role middleware
 * Requires user to be a business partner
 */
export const requirePartner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // TODO: Check if user is an approved business partner
    const userId = (req as any).userId;
    
    // Placeholder - implement partner verification
    // const isPartner = await partnersService.isApprovedPartner(userId);
    
    next();
  } catch (error) {
    next(error);
  }
};
