/**
 * Client-side Error Handling Utility
 * Provides user-friendly error messages and standardized error handling
 */

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    path?: string;
  };
  timestamp: string;
}

export class AppError extends Error {
  code: string;
  statusCode?: number;
  userMessage: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode?: number,
    userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  private getDefaultUserMessage(code: string): string {
    const messages: Record<string, string> = {
      NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
      TIMEOUT_ERROR: 'The request took too long. Please try again.',
      UNAUTHORIZED: 'Your session has expired. Please log in again.',
      FORBIDDEN: 'You do not have permission to perform this action.',
      NOT_FOUND: 'The requested resource was not found.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    };
    return messages[code] || messages.UNKNOWN_ERROR;
  }
}

/**
 * Parse API error response
 */
export function parseApiError(error: any): AppError {
  // Axios error
  if (error.response) {
    const data = error.response.data;
    if (data?.error) {
      return new AppError(
        data.error.message || data.error,
        data.error.code || 'API_ERROR',
        error.response.status,
        data.error.message || data.error
      );
    }
    return new AppError(
      `HTTP ${error.response.status}: ${error.response.statusText}`,
      'HTTP_ERROR',
      error.response.status
    );
  }

  // Network error
  if (error.request) {
    return new AppError(
      'Network request failed',
      'NETWORK_ERROR',
      undefined,
      'Unable to connect to the server. Please check your internet connection.'
    );
  }

  // Timeout
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return new AppError(
      'Request timeout',
      'TIMEOUT_ERROR',
      undefined,
      'The request took too long. Please try again.'
    );
  }

  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Generic error
  return new AppError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR'
  );
}

/**
 * Handle error and show user-friendly message
 */
export function handleError(error: any, showToast?: (message: string) => void): AppError {
  const appError = parseApiError(error);
  
  // Log error for debugging
  console.error('Error handled:', {
    message: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    originalError: error,
  });

  // Show user-friendly message if toast function provided
  if (showToast) {
    showToast(appError.userMessage);
  }

  return appError;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: any): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  const appError = parseApiError(error);
  return appError.userMessage;
}

