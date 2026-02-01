import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * Validation middleware factory
 * Validates request body against a Zod schema
 */
export declare const validateRequest: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Validate query parameters
 */
export declare const validateQuery: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Validate URL parameters
 */
export declare const validateParams: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=validation.middleware.d.ts.map