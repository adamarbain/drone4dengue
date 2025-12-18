/**
 * Standardized Error Response Utility
 * Use this to ensure consistent error responses across all controllers
 */

const logger = require('./logger');

/**
 * Create a standardized error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code (optional)
 * @param {Object} details - Additional error details (optional)
 */
function sendErrorResponse(res, statusCode, message, code = null, details = null) {
  const errorCode = code || getDefaultErrorCode(statusCode);
  
  const response = {
    success: false,
    error: {
      message,
      code: errorCode,
      ...(details && { details })
    },
    timestamp: new Date().toISOString(),
    path: res.req?.path || res.req?.url
  };

  // Log error
  logger.error(`Error response: ${statusCode} - ${message}`, {
    code: errorCode,
    path: response.path,
    method: res.req?.method,
    statusCode
  });

  return res.status(statusCode).json(response);
}

/**
 * Get default error code based on status code
 */
function getDefaultErrorCode(statusCode) {
  const codes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };
  return codes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Handle validation errors
 */
function sendValidationError(res, errors) {
  return sendErrorResponse(
    res,
    400,
    'Validation failed',
    'VALIDATION_ERROR',
    { errors }
  );
}

/**
 * Handle not found errors
 */
function sendNotFoundError(res, resource = 'Resource') {
  return sendErrorResponse(
    res,
    404,
    `${resource} not found`,
    'NOT_FOUND'
  );
}

/**
 * Handle unauthorized errors
 */
function sendUnauthorizedError(res, message = 'Unauthorized') {
  return sendErrorResponse(
    res,
    401,
    message,
    'UNAUTHORIZED'
  );
}

/**
 * Handle forbidden errors
 */
function sendForbiddenError(res, message = 'Forbidden') {
  return sendErrorResponse(
    res,
    403,
    message,
    'FORBIDDEN'
  );
}

/**
 * Handle conflict errors
 */
function sendConflictError(res, message = 'Conflict') {
  return sendErrorResponse(
    res,
    409,
    message,
    'CONFLICT'
  );
}

/**
 * Handle internal server errors
 */
function sendInternalError(res, message = 'Internal server error', error = null) {
  if (error) {
    logger.error('Internal server error', {
      error: error.message,
      stack: error.stack,
      path: res.req?.path
    });
  }

  return sendErrorResponse(
    res,
    500,
    process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (message || 'Internal server error'),
    'INTERNAL_SERVER_ERROR'
  );
}

module.exports = {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendUnauthorizedError,
  sendForbiddenError,
  sendConflictError,
  sendInternalError,
};

