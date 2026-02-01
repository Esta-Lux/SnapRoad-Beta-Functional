import { Request, Response, NextFunction } from 'express';
/**
 * Global error handler middleware
 */
export declare const errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=error.middleware.d.ts.map