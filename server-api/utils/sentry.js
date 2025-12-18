/**
 * Sentry Error Tracking Setup
 * Configure Sentry for production error tracking
 * 
 * To enable:
 * 1. Install: npm install @sentry/node @sentry/profiling-node
 * 2. Set SENTRY_DSN in your .env file
 * 3. Sentry will automatically initialize if SENTRY_DSN is set
 */

let Sentry;

try {
  Sentry = require('@sentry/node');
  const { nodeProfilingIntegration } = require('@sentry/profiling-node');

  // Initialize Sentry if DSN is configured
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        nodeProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    console.log('[Sentry] Initialized successfully');
  } else {
    console.log('[Sentry] SENTRY_DSN not set, using placeholder');
  }
} catch (error) {
  console.warn('[Sentry] Package not installed, using placeholder:', error.message);
}

// Export Sentry or placeholder
module.exports = Sentry || {
  captureException: (error, context) => {
    console.error('[Sentry Placeholder] Error captured:', error.message, context);
  },
  captureMessage: (message, level = 'info') => {
    console.log(`[Sentry Placeholder] ${level.toUpperCase()}:`, message);
  },
};

