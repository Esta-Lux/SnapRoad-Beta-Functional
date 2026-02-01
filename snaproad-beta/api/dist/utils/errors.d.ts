/**
 * Custom API Error class
 */
export declare class ApiError extends Error {
    statusCode: number;
    errors?: any;
    constructor(statusCode: number, message: string, errors?: any);
    static badRequest(message: string, errors?: any): ApiError;
    static unauthorized(message?: string): ApiError;
    static forbidden(message?: string): ApiError;
    static notFound(message?: string): ApiError;
    static conflict(message: string): ApiError;
    static tooManyRequests(message?: string): ApiError;
    static internal(message?: string): ApiError;
}
/**
 * Async handler wrapper to catch errors
 */
export declare const asyncHandler: (fn: Function) => (req: any, res: any, next: any) => void;
//# sourceMappingURL=errors.d.ts.map