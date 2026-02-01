"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const response_1 = require("../utils/response");
/**
 * Global error handler middleware
 */
const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);
    // Handle API errors
    if (error instanceof errors_1.ApiError) {
        return response_1.ApiResponse.error(res, error.statusCode, error.message, error.errors);
    }
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
        return response_1.ApiResponse.error(res, 400, 'Validation error', error);
    }
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        return response_1.ApiResponse.error(res, 401, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
        return response_1.ApiResponse.error(res, 401, 'Token expired');
    }
    // Handle Postgres errors
    if (error.code === '23505') {
        return response_1.ApiResponse.error(res, 409, 'Resource already exists');
    }
    if (error.code === '23503') {
        return response_1.ApiResponse.error(res, 400, 'Invalid reference');
    }
    // Default server error
    return response_1.ApiResponse.error(res, 500, process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map