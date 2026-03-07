import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { ApiResponse } from '../utils/response';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);
  
  // Handle API errors
  if (error instanceof ApiError) {
    return ApiResponse.error(
      res,
      error.statusCode,
      error.message,
      error.errors
    );
  }
  
  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return ApiResponse.error(res, 400, 'Validation error', error);
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 401, 'Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 401, 'Token expired');
  }
  
  // Handle Postgres errors
  if ((error as any).code === '23505') {
    return ApiResponse.error(res, 409, 'Resource already exists');
  }
  
  if ((error as any).code === '23503') {
    return ApiResponse.error(res, 400, 'Invalid reference');
  }
  
  // Default server error
  return ApiResponse.error(
    res,
    500,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message
  );
};
