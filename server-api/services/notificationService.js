const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

// Expo Push Notification API endpoint
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Notification service - Helper functions for creating notifications
 */

/**
 * Create notification for specific user(s) or company
 * @param {Object} data - Notification data
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message
 * @param {string} data.type - Notification type
 * @param {string} data.companyId - Company ID
 * @param {string[]} [data.userIds] - Array of user IDs (optional, if not provided, sends to all company users)
 * @param {Object} [data.metadata] - Additional metadata
 */
async function createNotification({ title, message, type, companyId, userIds = null, metadata = null }) {
  try {
    // If userIds is provided, create notifications for specific users
    if (userIds && userIds.length > 0) {
      const notifications = await Promise.all(
        userIds.map(userId =>
          prisma.notification.create({
            data: {
              title,
              message,
              type,
              companyId,
              userId,
              metadata: metadata || {}
            }
          })
        )
      );
      return notifications;
    } else {
      // Create company-wide notification (userId is null)
      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          companyId,
          userId: null,
          metadata: metadata || {}
        }
      });
      return [notification];
    }
  } catch (error) {
    console.error('[CREATE NOTIFICATION ERROR]', error);
    throw error;
  }
}

/**
 * Send push notification via Expo Push API
 * @param {string[]} pushTokens - Array of Expo push tokens
 * @param {Object} notification - Notification data
 */
async function sendPushNotification(pushTokens, notification) {
  if (!pushTokens || pushTokens.length === 0) {
    return;
  }

  try {
    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.message,
      data: {
        type: notification.type,
        ...notification.metadata
      },
      badge: 1, // Increment badge count
      priority: notification.metadata?.riskLevel === 'high' ? 'high' : 'default',
      channelId: 'default' // Android channel
    }));

    const response = await axios.post(EXPO_PUSH_API_URL, messages, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      }
    });

    console.log(`[PUSH NOTIFICATION] Sent ${messages.length} push notifications`);
    
    // Check for errors in response
    if (response.data.data) {
      const errors = response.data.data.filter(item => item.status === 'error');
      if (errors.length > 0) {
        console.error('[PUSH NOTIFICATION] Some notifications failed:', errors);
      }
    }
  } catch (error) {
    console.error('[PUSH NOTIFICATION ERROR] Failed to send push notifications:', error.message);
    // Don't throw - push notification failure shouldn't break the main flow
  }
}

/**
 * Get push tokens for users
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<string[]>} Array of push tokens
 */
async function getPushTokensForUsers(userIds) {
  try {
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true
      },
      select: {
        pushToken: true
      }
    });

    return deviceTokens.map(dt => dt.pushToken);
  } catch (error) {
    console.error('[PUSH NOTIFICATION ERROR] Failed to get push tokens:', error);
    return [];
  }
}

/**
 * Notify mobile users and admins when company prediction is created
 */
async function notifyCompanyPredictionCreated(prediction) {
  try {
    const { companyId, companyLocationId, riskScore, latitude, longitude } = prediction;
    
    // Get risk level from risk score
    let riskLevel = 'low';
    if (riskScore >= 3.0) riskLevel = 'high';
    else if (riskScore >= 1.0) riskLevel = 'medium';

    // Get company location name
    let locationName = 'Unknown Location';
    if (companyLocationId) {
      const location = await prisma.companyLocation.findUnique({
        where: { id: companyLocationId }
      });
      if (location) {
        locationName = location.name;
      }
    }

    // Get all mobile users (role='user') in the company
    const mobileUsers = await prisma.user.findMany({
      where: {
        companyId,
        role: 'user'
      },
      select: { id: true }
    });

    // Get all admin users (role='admin') in the company
    const adminUsers = await prisma.user.findMany({
      where: {
        companyId,
        role: 'admin'
      },
      select: { id: true }
    });

    // Combine all user IDs (mobile users + admins)
    const allUserIds = [
      ...mobileUsers.map(u => u.id),
      ...adminUsers.map(a => a.id)
    ];

    if (allUserIds.length === 0) {
      console.log(`[NOTIFICATION] No users found for company ${companyId}`);
      return;
    }

    // const title = `New Dengue Risk Prediction - ${riskLevel.toUpperCase()} Risk`;
    // const message = `A new dengue risk prediction has been created for ${locationName}. Risk Level: ${riskLevel.toUpperCase()}`;
    let riskEmoji = '🟢';
    if (riskLevel === 'high') riskEmoji = '🔴';
    else if (riskLevel === 'medium') riskEmoji = '🟠';
    const title = `${riskEmoji} ${locationName}`;
    const message = `${riskLevel} dengue risk detected in ${locationName}`;

    // Create notifications for all users (mobile + admin)
    await createNotification({
      title,
      message,
      type: 'prediction',
      companyId,
      userIds: allUserIds,
      metadata: {
        riskLevel,
        riskScore,
        latitude,
        longitude,
        companyLocationId,
        predictionId: prediction.id
      }
    });

    // Send push notifications (only to mobile users who have push tokens)
    const mobileUserIds = mobileUsers.map(u => u.id);
    const pushTokens = await getPushTokensForUsers(mobileUserIds);
    if (pushTokens.length > 0) {
      await sendPushNotification(pushTokens, {
        title,
        message,
        type: 'prediction',
        metadata: {
          riskLevel,
          riskScore,
          latitude,
          longitude,
          companyLocationId,
          predictionId: prediction.id
        }
      });
    }

    console.log(`[NOTIFICATION] Sent prediction notification to ${allUserIds.length} users (${mobileUsers.length} mobile, ${adminUsers.length} admin, ${pushTokens.length} push notifications)`);
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to notify company prediction:', error);
  }
}

/**
 * Notify admin users when dengue case is added
 */
async function notifyDengueCaseAdded(dengueData) {
  try {
    let { companyId, companyLocationId } = dengueData;
    
    // If no companyId, try to get it from companyLocation
    if (!companyId && companyLocationId) {
      const location = await prisma.companyLocation.findUnique({
        where: { id: companyLocationId },
        select: { companyId: true }
      });
      if (location) {
        companyId = location.companyId;
      }
    }
    
    if (!companyId) {
      // If no companyId, we need to find which companies might be affected
      // For now, we'll skip if no companyId
      console.log('[NOTIFICATION] Dengue data has no companyId, skipping notification');
      return;
    }

    // Get all admin users in the company
    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: 'admin'
      },
      select: { id: true }
    });

    if (admins.length === 0) {
      console.log(`[NOTIFICATION] No admin users found for company ${companyId}`);
      return;
    }

    const adminIds = admins.map(a => a.id);
    const title = 'New Dengue Case Added';
    const message = `A new dengue case has been added: ${dengueData.location} - ${dengueData.totalCases || 0} total cases`;

    await createNotification({
      title,
      message,
      type: 'dengue_case',
      companyId,
      userIds: adminIds,
      metadata: {
        location: dengueData.location,
        totalCases: dengueData.totalCases,
        activeCases: dengueData.activeCases,
        date: dengueData.date,
        dengueDataId: dengueData.id
      }
    });

    console.log(`[NOTIFICATION] Sent dengue case notification to ${adminIds.length} admins`);
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to notify dengue case:', error);
  }
}

/**
 * Notify admin users when drone is created or updated
 */
async function notifyDroneChange(drone, action = 'created') {
  try {
    const { companyId, id, name, droneId } = drone;

    // Get all admin users in the company
    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: 'admin'
      },
      select: { id: true }
    });

    if (admins.length === 0) {
      console.log(`[NOTIFICATION] No admin users found for company ${companyId}`);
      return;
    }

    const adminIds = admins.map(a => a.id);
    const title = action === 'created' ? 'New Drone Added' : 'Drone Updated';
    const message = `Drone ${name} (${droneId}) has been ${action === 'created' ? 'added' : 'updated'}`;

    await createNotification({
      title,
      message,
      type: 'drone',
      companyId,
      userIds: adminIds,
      metadata: {
        droneId: id,
        droneName: name,
        droneDisplayId: droneId,
        action
      }
    });

    console.log(`[NOTIFICATION] Sent drone ${action} notification to ${adminIds.length} admins`);
  } catch (error) {
    console.error(`[NOTIFICATION ERROR] Failed to notify drone ${action}:`, error);
  }
}

/**
 * Notify admin users when drone images are uploaded
 */
async function notifyDroneImagesUploaded(images, drone) {
  try {
    const { companyId } = drone;

    // Get all admin users in the company
    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: 'admin'
      },
      select: { id: true }
    });

    if (admins.length === 0) {
      console.log(`[NOTIFICATION] No admin users found for company ${companyId}`);
      return;
    }

    const adminIds = admins.map(a => a.id);
    const imageCount = images.length;
    const title = 'New Drone Images Uploaded';
    const message = `${imageCount} new image${imageCount > 1 ? 's' : ''} uploaded for drone ${drone.name} (${drone.droneId})`;

    await createNotification({
      title,
      message,
      type: 'drone_image',
      companyId,
      userIds: adminIds,
      metadata: {
        droneId: drone.id,
        droneName: drone.name,
        droneDisplayId: drone.droneId,
        imageCount,
        imageIds: images.map(img => img.id)
      }
    });

    console.log(`[NOTIFICATION] Sent drone image upload notification to ${adminIds.length} admins`);
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to notify drone images:', error);
  }
}

/**
 * Notify admin users when company location is created or updated
 */
async function notifyCompanyLocationChange(location, action = 'created') {
  try {
    const { companyId, id, name } = location;

    // Get all admin users in the company
    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: 'admin'
      },
      select: { id: true }
    });

    if (admins.length === 0) {
      console.log(`[NOTIFICATION] No admin users found for company ${companyId}`);
      return;
    }

    const adminIds = admins.map(a => a.id);
    const title = action === 'created' ? 'New Company Location Added' : 'Company Location Updated';
    const message = `Location ${name} has been ${action === 'created' ? 'added' : 'updated'}`;

    await createNotification({
      title,
      message,
      type: 'location',
      companyId,
      userIds: adminIds,
      metadata: {
        locationId: id,
        locationName: name,
        action
      }
    });

    console.log(`[NOTIFICATION] Sent location ${action} notification to ${adminIds.length} admins`);
  } catch (error) {
    console.error(`[NOTIFICATION ERROR] Failed to notify location ${action}:`, error);
  }
}

/**
 * Get recommendations message based on risk level
 * Returns a friendly, action-oriented message instead of alarming risk notification
 */
async function getRecommendationMessage(riskLevel) {
  try {
    // Fetch recommendations from database
    const recommendations = await prisma.recommendation.findMany({
      where: { 
        risk: riskLevel.toLowerCase()
      },
      orderBy: { createdAt: 'asc' },
      take: 2 // Get top 2 recommendations
    });

    if (recommendations.length > 0) {
      // Create a friendly message with actionable recommendations
      const primaryRecommendation = recommendations[0];
      const secondaryRecommendation = recommendations.length > 1 ? recommendations[1] : null;
      
      // Create concise message for push notification (max ~100 chars for body)
      let message = primaryRecommendation.title;
      if (secondaryRecommendation && message.length < 60) {
        message += `. Also: ${secondaryRecommendation.title}`;
      }
      
      return {
        title: 'Daily Health Tips',
        message: message,
        recommendations: recommendations.map(r => ({ title: r.title, details: r.details }))
      };
    } else {
      // Fallback messages if no recommendations found in database
      const fallbackMessages = {
        high: {
          title: 'Daily Health Tips',
          message: 'Take preventive measures: Clear stagnant water and use mosquito repellent to stay protected.'
        },
        medium: {
          title: 'Daily Health Tips',
          message: 'Stay vigilant: Keep your surroundings clean and check for standing water regularly.'
        },
        low: {
          title: 'Daily Health Tips',
          message: 'Maintain good practices: Keep your area clean and stay hydrated for better health.'
        }
      };
      
      return fallbackMessages[riskLevel.toLowerCase()] || fallbackMessages.low;
    }
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to fetch recommendations:', error);
    // Return safe fallback message
    return {
      title: 'Daily Health Tips',
      message: 'Stay proactive with preventive measures to maintain a healthy environment.'
    };
  }
}

/**
 * Notify mobile user about daily prediction with recommendations
 */
async function notifyDailyPrediction(userId, companyId, prediction) {
  try {
    const { riskLevel, riskScore, latitude, longitude } = prediction;
    
    // Get recommendation-based message instead of risk alert
    const recommendationMessage = await getRecommendationMessage(riskLevel);
    
    const title = recommendationMessage.title;
    const message = recommendationMessage.message;

    await createNotification({
      title,
      message,
      type: 'daily_prediction',
      companyId,
      userIds: [userId],
      metadata: {
        riskLevel,
        riskScore,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        recommendations: recommendationMessage.recommendations || []
      }
    });

    // Send push notification
    const pushTokens = await getPushTokensForUsers([userId]);
    if (pushTokens.length > 0) {
      await sendPushNotification(pushTokens, {
        title,
        message,
        type: 'daily_prediction',
        metadata: {
          riskLevel,
          riskScore,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          recommendations: recommendationMessage.recommendations || []
        }
      });
    }

    console.log(`[NOTIFICATION] Sent daily recommendation notification to user ${userId} (${pushTokens.length} push notifications)`);
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to notify daily prediction:', error);
  }
}

module.exports = {
  createNotification,
  sendPushNotification,
  getPushTokensForUsers,
  notifyCompanyPredictionCreated,
  notifyDengueCaseAdded,
  notifyDroneChange,
  notifyDroneImagesUploaded,
  notifyCompanyLocationChange,
  notifyDailyPrediction
};

