import { Response } from 'express';
export declare class ApiResponse {
    /**
     * Success response (200)
     */
    static success<T>(res: Response, data: T, message?: string): Response<any, Record<string, any>>;
    /**
     * Created response (201)
     */
    static created<T>(res: Response, data: T, message?: string): Response<any, Record<string, any>>;
    /**
     * Paginated response
     */
    static paginated<T>(res: Response, data: T[], meta: {
        page: number;
        limit: number;
        total: number;
    }): Response<any, Record<string, any>>;
    /**
     * Error response
     */
    static error(res: Response, statusCode: number, message: string, details?: any): Response<any, Record<string, any>>;
    /**
     * No content response (204)
     */
    static noContent(res: Response): Response<any, Record<string, any>>;
}
//# sourceMappingURL=response.d.ts.map