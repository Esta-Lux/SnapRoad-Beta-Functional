"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getCurrentUser = exports.refreshToken = exports.verifyEmail = exports.forgotPassword = exports.login = exports.register = void 0;
const authService = __importStar(require("../services/auth.service"));
const response_1 = require("../utils/response");
/**
 * Register a new user
 */
const register = async (req, res, next) => {
    try {
        const { email, password, fullName, phone } = req.body;
        // TODO: Implement with Supabase Auth
        const result = await authService.registerUser({ email, password, fullName, phone });
        return response_1.ApiResponse.created(res, result, 'User registered successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
/**
 * Login user
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // TODO: Implement with Supabase Auth
        const result = await authService.loginUser({ email, password });
        return response_1.ApiResponse.success(res, result, 'Login successful');
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
/**
 * Forgot password
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        // TODO: Implement with Supabase Auth
        await authService.sendPasswordReset(email);
        return response_1.ApiResponse.success(res, null, 'Password reset email sent');
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
/**
 * Verify email
 */
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;
        // TODO: Implement with Supabase Auth
        await authService.verifyEmail(token);
        return response_1.ApiResponse.success(res, null, 'Email verified successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.verifyEmail = verifyEmail;
/**
 * Refresh token
 */
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        // TODO: Implement with Supabase Auth
        const result = await authService.refreshAccessToken(refreshToken);
        return response_1.ApiResponse.success(res, result, 'Token refreshed');
    }
    catch (error) {
        next(error);
    }
};
exports.refreshToken = refreshToken;
/**
 * Get current user
 */
const getCurrentUser = async (req, res, next) => {
    try {
        // TODO: Get user from request (set by auth middleware)
        const userId = req.userId;
        const user = await authService.getUserById(userId);
        return response_1.ApiResponse.success(res, user);
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrentUser = getCurrentUser;
/**
 * Logout user
 */
const logout = async (req, res, next) => {
    try {
        const userId = req.userId;
        // TODO: Implement logout logic (invalidate refresh token)
        await authService.logoutUser(userId);
        return response_1.ApiResponse.success(res, null, 'Logged out successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
//# sourceMappingURL=auth.controller.js.map