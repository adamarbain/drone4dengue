require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for video frame uploads

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routers (to be implemented in separate files)
app.use('/auth', require('./routes/authRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/drones', require('./routes/droneRoutes'));
app.use('/weather', require('./routes/admin/weatherRoutes'));
app.use('/recommendations', require('./routes/recommendationRoutes'));
app.use('/dengue-data', require('./routes/admin/dengueDataRoutes'));
app.use('/companies', require('./routes/companies'));
app.use('/company-locations', require('./routes/companyLocationRoutes'));
app.use('/geocode', require('./routes/geocode'));
app.use('/api/predict', require('./routes/predictionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/location-alerts', require('./routes/locationAlertRoutes'));
app.use('/api/prediction-accuracy', require('./routes/predictionAccuracyRoutes'));

// app.use('/images', require('./routes/images'));
// app.use('/alerts', require('./routes/alerts'));
// app.use('/reports', require('./routes/admin/reportRoutes'));

app.get('/', (req, res) => {
  res.json({ status: 'DengueEye API running' });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      path: req.path
    },
    timestamp: new Date().toISOString()
  });
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`, { 
    environment: process.env.NODE_ENV || 'development',
    port: PORT 
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app; 