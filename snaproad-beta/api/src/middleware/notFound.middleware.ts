import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/response';

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return ApiResponse.error(
    res,
    404,
    `Route ${req.method} ${req.originalUrl} not found`
  );
};
