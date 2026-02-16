import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export class ApiResponse {
  /**
   * Success response (200)
   */
  static success<T>(res: Response, data: T, message?: string) {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message })
    };
    return res.status(200).json(response);
  }

  /**
   * Created response (201)
   */
  static created<T>(res: Response, data: T, message?: string) {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message })
    };
    return res.status(201).json(response);
  }

  /**
   * Paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    meta: { page: number; limit: number; total: number }
  ) {
    const response: SuccessResponse<T[]> = {
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
  static error(
    res: Response,
    statusCode: number,
    message: string,
    details?: any
  ) {
    const response: ErrorResponse = {
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
  static noContent(res: Response) {
    return res.status(204).send();
  }
}
