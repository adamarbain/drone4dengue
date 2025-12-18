const logger = require('../utils/logger');
const Sentry = require('../utils/sentry');

/**
 * Global error handler middleware
 * Standardizes error responses across the application
 */
function errorHandler(err, req, res, next) {
  // Log error with context
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.userId || null,
    body: req.body ? JSON.stringify(req.body).substring(0, 200) : null
  });

  // Send to Sentry for production error tracking
  Sentry.captureException(err, {
    tags: {
      path: req.path,
      method: req.method,
    },
    user: {
      id: req.userId || undefined,
    },
    extra: {
      body: req.body ? JSON.stringify(req.body).substring(0, 200) : null,
      ip: req.ip,
    },
  });

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma errors
    if (err.code === 'P2002') {
      statusCode = 409; // Unique constraint violation
      err.message = 'A record with this value already exists';
    } else if (err.code === 'P2025') {
      statusCode = 404; // Record not found
      err.message = 'Record not found';
    } else {
      statusCode = 400;
    }
  }

  // Standardized error response format
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details
      })
    },
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Don't expose internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    errorResponse.error.message = 'Internal server error';
    errorResponse.error.code = 'INTERNAL_ERROR';
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler; 