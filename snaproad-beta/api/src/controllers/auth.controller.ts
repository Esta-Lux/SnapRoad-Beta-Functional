import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { ApiResponse } from '../utils/response';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, phone } = req.body;
    
    // TODO: Implement with Supabase Auth
    const result = await authService.registerUser({ email, password, fullName, phone });
    
    return ApiResponse.created(res, result, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    // TODO: Implement with Supabase Auth
    const result = await authService.loginUser({ email, password });
    
    return ApiResponse.success(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    
    // TODO: Implement with Supabase Auth
    await authService.sendPasswordReset(email);
    
    return ApiResponse.success(res, null, 'Password reset email sent');
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    
    // TODO: Implement with Supabase Auth
    await authService.verifyEmail(token);
    
    return ApiResponse.success(res, null, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    
    // TODO: Implement with Supabase Auth
    const result = await authService.refreshAccessToken(refreshToken);
    
    return ApiResponse.success(res, result, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Get user from request (set by auth middleware)
    const userId = (req as any).userId;
    
    const user = await authService.getUserById(userId);
    
    return ApiResponse.success(res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    
    // TODO: Implement logout logic (invalidate refresh token)
    await authService.logoutUser(userId);
    
    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};
