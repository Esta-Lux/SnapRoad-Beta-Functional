"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    /**
     * Success response (200)
     */
    static success(res, data, message) {
        const response = {
            success: true,
            data,
            ...(message && { message })
        };
        return res.status(200).json(response);
    }
    /**
     * Created response (201)
     */
    static created(res, data, message) {
        const response = {
            success: true,
            data,
            ...(message && { message })
        };
        return res.status(201).json(response);
    }
    /**
     * Paginated response
     */
    static paginated(res, data, meta) {
        const response = {
            success: true,
            data,
            meta: {
                page: meta.page,
                limit: meta.limit,
                total: meta.total,
                totalPages: Math.ceil(meta.total / meta.limit)
            }
        };
        return res.status(200).json(response);
    }
    /**
     * Error response
     */
    static error(res, statusCode, message, details) {
        const response = {
            success: false,
            error: {
                message,
                ...(details && { details })
            }
        };
        return res.status(statusCode).json(response);
    }
    /**
     * No content response (204)
     */
    static noContent(res) {
        return res.status(204).send();
    }
}
exports.ApiResponse = ApiResponse;
//# sourceMappingURL=response.js.map