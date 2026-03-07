import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/errors';

/**
 * Validation middleware factory
 * Validates request body against a Zod schema
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        next(new ApiError(400, 'Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        next(new ApiError(400, 'Invalid query parameters', errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        next(new ApiError(400, 'Invalid URL parameters', errors));
      } else {
        next(error);
      }
    }
  };
};
