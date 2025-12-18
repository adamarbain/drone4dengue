# Error Handling Guide

This document describes the comprehensive error handling implementation across the Drone4Dengue project.

## Overview

The project now implements a complete error handling system with:
- ✅ Global error handler middleware
- ✅ Structured logging (Winston)
- ✅ Standardized error response format
- ✅ React Error Boundaries
- ✅ Client-side error handling utilities
- ✅ Sentry error tracking setup (ready to configure)

## Server-Side Error Handling

### Global Error Handler

Located in `server-api/middleware/errorHandler.js`, this middleware:
- Catches all unhandled errors
- Standardizes error response format
- Logs errors with context
- Sends errors to Sentry (when configured)
- Handles Prisma errors automatically

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE"
  },
  "timestamp": "2025-01-XX...",
  "path": "/api/endpoint"
}
```

### Structured Logging

Using Winston for production-ready logging:
- Console output in development
- File logging in production (`logs/error.log`, `logs/combined.log`)
- Different log levels (error, warn, info, http, debug)
- Request logging middleware

**Usage:**
```javascript
const logger = require('./utils/logger');

logger.info('User logged in', { userId: user.id });
logger.error('Database error', { error: err.message });
```

### Error Response Utilities

Located in `server-api/utils/errorResponse.js`, provides helper functions:

```javascript
const { 
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendUnauthorizedError,
  sendForbiddenError,
  sendConflictError,
  sendInternalError
} = require('../utils/errorResponse');

// Example usage
if (!user) {
  return sendNotFoundError(res, 'User');
}

if (!hasPermission) {
  return sendForbiddenError(res, 'You do not have permission');
}
```

### Controller Error Handling Pattern

```javascript
async function myController(req, res) {
  try {
    // Your logic here
    if (!data) {
      return sendNotFoundError(res, 'Resource');
    }
    
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Controller error', { error: error.message, stack: error.stack });
    return sendInternalError(res, 'Failed to process request', error);
  }
}
```

## Client-Side Error Handling

### React Error Boundaries

Both `client-admin` and `client-mobile` have Error Boundaries that:
- Catch React component errors
- Display user-friendly error UI
- Allow users to retry or go home
- Show error details in development mode

**Admin:** `client-admin/src/components/ErrorBoundary.tsx`
**Mobile:** `client-mobile/components/ErrorBoundary.tsx`

Both apps are wrapped with ErrorBoundary in their root layouts.

### Error Handling Utilities

**Admin:** `client-admin/src/lib/errorHandler.ts`
**Mobile:** `client-mobile/utils/errorHandler.ts`

Provides:
- `AppError` class for typed errors
- `parseApiError()` to parse API errors
- `handleError()` to handle and display errors
- `getUserFriendlyMessage()` for user-facing messages

**Usage Example:**
```typescript
import { handleError, getUserFriendlyMessage } from '@/lib/errorHandler';

try {
  const data = await api.getData();
} catch (error) {
  const appError = handleError(error, (msg) => toast.error(msg));
  // Or use Alert in mobile
}
```

### API Error Handling

The error handlers automatically:
- Parse axios/fetch errors
- Extract error messages from API responses
- Provide user-friendly messages
- Handle network errors, timeouts, etc.

## Error Codes

Standard error codes used across the application:

- `BAD_REQUEST` (400) - Invalid request
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource conflict (e.g., duplicate)
- `VALIDATION_ERROR` (422) - Validation failed
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_SERVER_ERROR` (500) - Server error
- `SERVICE_UNAVAILABLE` (503) - Service unavailable

## Sentry Integration

Sentry is set up but requires configuration:

1. Install Sentry:
```bash
cd server-api
npm install @sentry/node @sentry/profiling-node
```

2. Add to `.env`:
```
SENTRY_DSN=your_sentry_dsn_here
```

3. Uncomment the Sentry initialization in `server-api/utils/sentry.js`

4. For client-side Sentry:
```bash
# Admin
cd client-admin
npm install @sentry/nextjs

# Mobile
cd client-mobile
npm install @sentry/react-native
```

## Best Practices

1. **Always use try-catch** in async controllers
2. **Use error response utilities** instead of manual responses
3. **Log errors** with context (userId, path, etc.)
4. **Provide user-friendly messages** on the client
5. **Don't expose internal errors** in production
6. **Handle specific error types** (Prisma, validation, etc.)
7. **Use Error Boundaries** for React components
8. **Test error scenarios** in development

## Migration Guide

To migrate existing controllers:

1. Import error utilities:
```javascript
const { sendErrorResponse, sendNotFoundError } = require('../utils/errorResponse');
const logger = require('../utils/logger');
```

2. Replace manual error responses:
```javascript
// Before
res.status(404).json({ error: 'Not found' });

// After
return sendNotFoundError(res, 'Resource');
```

3. Add try-catch with logging:
```javascript
try {
  // logic
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  return sendInternalError(res, 'Operation failed', error);
}
```

## Testing Error Handling

1. Test network errors (disconnect internet)
2. Test validation errors (invalid input)
3. Test authentication errors (expired tokens)
4. Test server errors (database down)
5. Test React component errors (render errors)

## Monitoring

- **Development:** Check console logs
- **Production:** 
  - Check `server-api/logs/error.log`
  - Configure Sentry for real-time alerts
  - Monitor error rates and patterns

