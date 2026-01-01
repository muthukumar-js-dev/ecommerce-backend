/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

/**
 * API error format
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Helper to create success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    status: 'success',
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper to create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiResponse<never> {
  return {
    status: 'error',
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}
