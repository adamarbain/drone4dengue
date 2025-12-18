/**
 * Client-side Error Handling Utility for Mobile
 * Provides user-friendly error messages and standardized error handling
 */

import { Alert } from 'react-native';

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
  // Fetch error with response
  if (error.response || (error as any).status) {
    const response = error.response || error;
    const data = (response as any).data || (response as any).json?.();
    
    if (data?.error) {
      return new AppError(
        data.error.message || data.error,
        data.error.code || 'API_ERROR',
        response.status,
        data.error.message || data.error
      );
    }
    return new AppError(
      `HTTP ${response.status}: ${response.statusText || 'Error'}`,
      'HTTP_ERROR',
      response.status
    );
  }

  // Network error
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return new AppError(
      'Network request failed',
      'NETWORK_ERROR',
      undefined,
      'Unable to connect to the server. Please check your internet connection.'
    );
  }

  // Timeout
  if (error.message?.includes('timeout')) {
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
 * Handle error and show user-friendly alert
 */
export function handleError(
  error: any,
  showAlert: boolean = true,
  customTitle?: string
): AppError {
  const appError = parseApiError(error);
  
  // Log error for debugging
  console.error('Error handled:', {
    message: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    originalError: error,
  });

  // Show alert if requested
  if (showAlert) {
    Alert.alert(
      customTitle || 'Error',
      appError.userMessage,
      [{ text: 'OK' }]
    );
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

/**
 * Show error alert
 */
export function showErrorAlert(error: any, title: string = 'Error'): void {
  const message = getUserFriendlyMessage(error);
  Alert.alert(title, message, [{ text: 'OK' }]);
}

