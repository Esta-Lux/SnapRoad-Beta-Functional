"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateRequest = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
/**
 * Validation middleware factory
 * Validates request body against a Zod schema
 */
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                next(new errors_1.ApiError(400, 'Validation failed', errors));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateRequest = validateRequest;
/**
 * Validate query parameters
 */
const validateQuery = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                next(new errors_1.ApiError(400, 'Invalid query parameters', errors));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateQuery = validateQuery;
/**
 * Validate URL parameters
 */
const validateParams = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                next(new errors_1.ApiError(400, 'Invalid URL parameters', errors));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateParams = validateParams;
//# sourceMappingURL=validation.middleware.js.map