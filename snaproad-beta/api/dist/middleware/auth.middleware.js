"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePartner = exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../utils/errors");
/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.ApiError(401, 'Authentication required');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new errors_1.ApiError(401, 'Token not provided');
        }
        // TODO: Implement with Supabase Auth or custom JWT verification
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // Attach user info to request
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.ApiError(401, 'Invalid token'));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.ApiError(401, 'Token expired'));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
/**
 * Admin role middleware
 * Requires user to have admin role
 */
const requireAdmin = async (req, res, next) => {
    try {
        const userRole = req.userRole;
        if (!userRole || !['admin', 'super_admin', 'moderator'].includes(userRole)) {
            throw new errors_1.ApiError(403, 'Admin access required');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireAdmin = requireAdmin;
/**
 * Partner role middleware
 * Requires user to be a business partner
 */
const requirePartner = async (req, res, next) => {
    try {
        // TODO: Check if user is an approved business partner
        const userId = req.userId;
        // Placeholder - implement partner verification
        // const isPartner = await partnersService.isApprovedPartner(userId);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requirePartner = requirePartner;
//# sourceMappingURL=auth.middleware.js.map