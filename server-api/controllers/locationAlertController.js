const prisma = require('../prisma/client');
const logger = require('../utils/logger');
const axios = require('axios');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendUnauthorizedError,
  sendForbiddenError,
  sendInternalError
} = require('../utils/errorResponse');
const { createNotification } = require('../services/notificationService');

// GET /api/location-alerts - Get all location alerts for current user
exports.getUserLocationAlerts = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    const alerts = await prisma.userLocationAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ alerts });
  } catch (err) {
    logger.error('[GET LOCATION ALERTS ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to fetch location alerts', err);
  }
};

// POST /api/location-alerts - Create a new location alert
exports.createLocationAlert = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // Check if user is authenticated
    if (!userId) {
      return sendUnauthorizedError(res, 'User not authenticated');
    }
    const { name, latitude, longitude } = req.body;
    
    // Validation
    if (!name || name.trim().length === 0) {
      return sendValidationError(res, ['Alert name is required']);
    }
    if (latitude === undefined || longitude === undefined) {
      return sendValidationError(res, ['Latitude and longitude are required']);
    }
    if (latitude < -90 || latitude > 90) {
      return sendValidationError(res, ['Invalid latitude value']);
    }
    if (longitude < -180 || longitude > 180) {
      return sendValidationError(res, ['Invalid longitude value']);
    }
    
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    
    if (!user) {
      return sendNotFoundError(res, 'User');
    }
    
    // Call Nominatim reverse geocoding to get bounding box
    let boundingBox = null;
    let address = null;
    
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'drone4dengue-admin/1.0 (contact: adamarbain2107@gmail.com)',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });
      
      if (response.data) {
        boundingBox = response.data.boundingbox || null;
        address = response.data.display_name || null;
        
        // Convert boundingbox strings to floats
        if (boundingBox && Array.isArray(boundingBox)) {
          boundingBox = boundingBox.map(val => parseFloat(val));
        }
      }
    } catch (geoErr) {
      logger.warn('[CREATE LOCATION ALERT] Nominatim API failed, using default bounding box', { error: geoErr.message });
    }
    
    // Ensure boundingBox is always set (required field in schema)
    // Create a default bounding box if Nominatim didn't provide one (approximately 500m radius)
    if (!boundingBox || !Array.isArray(boundingBox) || boundingBox.length !== 4) {
      const delta = 0.005; // ~500m
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      boundingBox = [
        lat - delta,  // minLat
        lat + delta,  // maxLat
        lon - delta, // minLon
        lon + delta  // maxLon
      ];
    }
    
    // Validate boundingBox values are valid numbers
    if (!boundingBox.every(val => typeof val === 'number' && !isNaN(val))) {
      logger.error('[CREATE LOCATION ALERT] Invalid boundingBox values', { boundingBox });
      return sendValidationError(res, ['Invalid bounding box values']);
    }
    
    // Log the data we're about to create for debugging
    logger.info('[CREATE LOCATION ALERT] Attempting to create alert', {
      userId,
      name: name.trim(),
      latitude,
      longitude,
      boundingBox,
      boundingBoxType: typeof boundingBox,
      boundingBoxIsArray: Array.isArray(boundingBox),
      address
    });
    
    // Ensure all values are properly formatted
    const alertData = {
      userId,
      name: name.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      boundingBox: boundingBox, // Prisma will handle JSON conversion
      address: address || null,
      isActive: true
    };
    
    console.log('[CREATE LOCATION ALERT] Data to insert:', JSON.stringify(alertData, null, 2));
    
    // Create the location alert
    let alert;
    try {
      alert = await prisma.userLocationAlert.create({
        data: alertData
      });
    } catch (prismaErr) {
      console.error('[CREATE LOCATION ALERT] Prisma error:', prismaErr);
      console.error('[CREATE LOCATION ALERT] Prisma error code:', prismaErr.code);
      console.error('[CREATE LOCATION ALERT] Prisma error meta:', prismaErr.meta);
      throw prismaErr; // Re-throw to be caught by outer catch
    }
    
    logger.info('[CREATE LOCATION ALERT] Alert created successfully', { alertId: alert.id, userId });
    res.status(201).json({ alert });
  } catch (err) {
    // Log detailed error information
    const errorDetails = {
      message: err.message,
      stack: err.stack,
      code: err.code,
      meta: err.meta,
      name: err.name,
      userId: req.user?.userId || 'unknown',
      body: req.body
    };
    
    // Also log to console for immediate visibility
    console.error('[CREATE LOCATION ALERT ERROR] Full error details:', JSON.stringify(errorDetails, null, 2));
    console.error('[CREATE LOCATION ALERT ERROR] Error stack:', err.stack);
    
    logger.error('[CREATE LOCATION ALERT ERROR]', errorDetails);
    return sendInternalError(res, 'Failed to create location alert', err);
  }
};

// DELETE /api/location-alerts/:id - Delete a location alert
exports.deleteLocationAlert = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return sendUnauthorizedError(res, 'User not authenticated');
    }
    const { id } = req.params;
    
    // Check if alert exists and belongs to user
    const alert = await prisma.userLocationAlert.findUnique({
      where: { id }
    });
    
    if (!alert) {
      return sendNotFoundError(res, 'Location alert');
    }
    
    if (alert.userId !== userId) {
      return sendForbiddenError(res, 'You can only delete your own alerts');
    }
    
    await prisma.userLocationAlert.delete({
      where: { id }
    });
    
    logger.info('[DELETE LOCATION ALERT] Alert deleted successfully', { alertId: id, userId });
    res.json({ message: 'Location alert deleted successfully' });
  } catch (err) {
    logger.error('[DELETE LOCATION ALERT ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to delete location alert', err);
  }
};

// PATCH /api/location-alerts/:id - Toggle alert active status
exports.toggleLocationAlert = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return sendUnauthorizedError(res, 'User not authenticated');
    }
    const { id } = req.params;
    const { isActive } = req.body;
    
    // Check if alert exists and belongs to user
    const alert = await prisma.userLocationAlert.findUnique({
      where: { id }
    });
    
    if (!alert) {
      return sendNotFoundError(res, 'Location alert');
    }
    
    if (alert.userId !== userId) {
      return sendForbiddenError(res, 'You can only update your own alerts');
    }
    
    const updatedAlert = await prisma.userLocationAlert.update({
      where: { id },
      data: { isActive: isActive !== undefined ? isActive : !alert.isActive }
    });
    
    logger.info('[TOGGLE LOCATION ALERT] Alert toggled successfully', { alertId: id, isActive: updatedAlert.isActive });
    res.json({ alert: updatedAlert });
  } catch (err) {
    logger.error('[TOGGLE LOCATION ALERT ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to toggle location alert', err);
  }
};

// POST /api/location-alerts/check-and-notify - Check dengue cases and send notifications
// This endpoint is called by GitHub Actions daily at 12pm Malaysia time
exports.checkAndNotify = async (req, res) => {
  try {
    // Optional API key validation for security
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.LOCATION_ALERT_API_KEY;
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return sendForbiddenError(res, 'Invalid API key');
    }
    
    logger.info('[CHECK AND NOTIFY] Starting location-based alert check');
    
    // Get all active location alerts with user data
    const activeAlerts = await prisma.userLocationAlert.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyId: true
          }
        }
      }
    });
    
    if (activeAlerts.length === 0) {
      logger.info('[CHECK AND NOTIFY] No active location alerts found');
      return res.json({ message: 'No active location alerts', notificationsSent: 0 });
    }
    
    // Get dengue cases from today and yesterday (based on date only, not datetime)
    // Since the date field is stored as 00:00:00, we need to compare dates, not datetimes
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight today
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1); // Yesterday at midnight
    
    // Query for records where date >= yesterday (at midnight)
    // This will match records from yesterday (00:00:00) and today (00:00:00)
    const dengueCases = await prisma.dengueData.findMany({
      where: {
        date: { gte: yesterday },
        activeCases: { not: null },
        latitude: { not: null },
        longitude: { not: null },
        OR: [
          { status: { contains: 'Active', mode: 'insensitive' } },
          { status: null } // Include cases without status as they might be active
        ]
      }
    });
    
    if (dengueCases.length === 0) {
      logger.info('[CHECK AND NOTIFY] No dengue cases found in last 24 hours');
      return res.json({ message: 'No dengue cases in last 24 hours', notificationsSent: 0 });
    }
    
    logger.info(`[CHECK AND NOTIFY] Found ${activeAlerts.length} active alerts and ${dengueCases.length} dengue cases`);
    
    // Check each alert against dengue cases
    let notificationsSent = 0;
    const userNotifications = new Map(); // userId -> { alertNames: [], cases: [] }
    
    for (const alert of activeAlerts) {
      const boundingBox = alert.boundingBox;
      
      if (!boundingBox || !Array.isArray(boundingBox) || boundingBox.length !== 4) {
        logger.warn('[CHECK AND NOTIFY] Invalid bounding box for alert', { alertId: alert.id });
        continue;
      }
      
      // Bounding box format: [minLat, maxLat, minLon, maxLon]
      const [minLat, maxLat, minLon, maxLon] = boundingBox;
      
      // Find dengue cases within this bounding box
      const matchingCases = dengueCases.filter(dengueCase => {
        const lat = dengueCase.latitude;
        const lon = dengueCase.longitude;
        return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
      });
      
      if (matchingCases.length > 0) {
        // Aggregate notifications per user
        if (!userNotifications.has(alert.userId)) {
          userNotifications.set(alert.userId, {
            user: alert.user,
            alertNames: [],
            totalCases: 0,
            locations: new Set()
          });
        }
        
        const userNotif = userNotifications.get(alert.userId);
        userNotif.alertNames.push(alert.name);
        userNotif.totalCases += matchingCases.reduce((sum, c) => sum + (c.activeCases || 0), 0);
        matchingCases.forEach(c => userNotif.locations.add(c.location));
      }
    }
    
    // Send notifications to users
    for (const [userId, data] of userNotifications) {
      try {
        const locationsList = Array.from(data.locations).slice(0, 3).join(', ');
        const moreLocations = data.locations.size > 3 ? ` and ${data.locations.size - 3} more` : '';
        
        await createNotification({
          title: '⚠️ Dengue Alert Near Your Location',
          message: `${data.totalCases} active dengue case(s) detected near your alert location(s): ${data.alertNames.join(', ')}. Areas affected: ${locationsList}${moreLocations}. Stay vigilant and take preventive measures.`,
          type: 'location_alert',
          companyId: data.user.companyId,
          userIds: [userId],
          metadata: {
            alertNames: data.alertNames,
            totalCases: data.totalCases,
            affectedLocations: Array.from(data.locations)
          }
        });
        
        notificationsSent++;
        logger.info('[CHECK AND NOTIFY] Notification sent to user', { userId, alertNames: data.alertNames });
      } catch (notifErr) {
        logger.error('[CHECK AND NOTIFY] Failed to send notification', { userId, error: notifErr.message });
      }
    }
    
    logger.info(`[CHECK AND NOTIFY] Completed. Sent ${notificationsSent} notifications`);
    res.json({ 
      message: 'Location alert check completed',
      notificationsSent,
      alertsChecked: activeAlerts.length,
      dengueCasesFound: dengueCases.length
    });
  } catch (err) {
    logger.error('[CHECK AND NOTIFY ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to check and notify', err);
  }
};

