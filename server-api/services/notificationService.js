const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { getRiskLevel } = require('../utils/riskLevelUtils');

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
    if (!userIds || userIds.length === 0) {
      console.log('[PUSH NOTIFICATION] No user IDs provided for push token lookup');
      return [];
    }

    // Filter out any null, undefined, or empty string values
    const validUserIds = userIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
    
    if (validUserIds.length === 0) {
      console.log('[PUSH NOTIFICATION] No valid user IDs after filtering:', userIds);
      return [];
    }

    if (validUserIds.length !== userIds.length) {
      console.log(`[PUSH NOTIFICATION] Filtered out ${userIds.length - validUserIds.length} invalid user ID(s). Original:`, userIds, 'Valid:', validUserIds);
    }

    console.log(`[PUSH NOTIFICATION] Looking up push tokens for ${validUserIds.length} user(s):`, validUserIds);

    // First, check ALL device tokens (including inactive) for these users to diagnose the issue
    const allDeviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId: { in: validUserIds }
      },
      select: {
        pushToken: true,
        userId: true,
        isActive: true,
        platform: true
      }
    });

    console.log(`[PUSH NOTIFICATION] Found ${allDeviceTokens.length} total device token(s) (active + inactive) for these users`);
    if (allDeviceTokens.length > 0) {
      console.log(`[PUSH NOTIFICATION] Device token details:`, allDeviceTokens.map(dt => ({
        userId: dt.userId,
        isActive: dt.isActive,
        platform: dt.platform,
        hasToken: !!dt.pushToken
      })));
    }

    // Now get only active tokens
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId: { in: validUserIds },
        isActive: true
      },
      select: {
        pushToken: true,
        userId: true
      }
    });

    const pushTokens = deviceTokens.map(dt => dt.pushToken);
    
    if (pushTokens.length === 0) {
      if (allDeviceTokens.length > 0) {
        const inactiveCount = allDeviceTokens.filter(dt => !dt.isActive).length;
        console.log(`[PUSH NOTIFICATION] WARNING: Found ${allDeviceTokens.length} device token(s) but ${inactiveCount} are inactive. Only active tokens are used for push notifications.`);
      } else {
        console.log(`[PUSH NOTIFICATION] No device tokens found for ${validUserIds.length} user(s). Checking if userIds match...`);
        // Check if any device tokens exist for these user IDs (case-insensitive check)
        const anyTokens = await prisma.deviceToken.findMany({
          select: {
            userId: true,
            isActive: true
          },
          take: 10
        });
        if (anyTokens.length > 0) {
          console.log(`[PUSH NOTIFICATION] Sample userIds in DeviceToken table:`, anyTokens.map(t => t.userId).slice(0, 5));
          console.log(`[PUSH NOTIFICATION] Querying for userIds:`, validUserIds);
        }
      }
    } else {
      console.log(`[PUSH NOTIFICATION] Found ${pushTokens.length} active push token(s) for ${validUserIds.length} user(s)`);
    }

    return pushTokens;
  } catch (error) {
    console.error('[PUSH NOTIFICATION ERROR] Failed to get push tokens:', error);
    console.error('[PUSH NOTIFICATION ERROR] Stack:', error.stack);
    return [];
  }
}

/**
 * Notify mobile users and admins when company prediction is created
 */
async function notifyCompanyPredictionCreated(prediction) {
  try {
    const { companyId, companyLocationId, riskScore, latitude, longitude } = prediction;
    // Get company settings for risk level thresholds
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { predictionModelParameters: true }
    });
    const predictionModelParameters = company?.predictionModelParameters || {};
    // Get risk level from risk score using company-specific thresholds
    const riskLevel = getRiskLevel(riskScore, predictionModelParameters);
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

    let riskEmoji = 'ℹ️';
    if (riskLevel === 'high') riskEmoji = '🚨';
    else if (riskLevel === 'medium') riskEmoji = '⚠️';
    const title = `${riskEmoji} ${locationName}`;
    const message = `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1).toLowerCase()} dengue risk detected in ${locationName}`;

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
    let pushTokens = [];
    
    if (mobileUserIds.length > 0) {
      console.log(`[NOTIFICATION] Attempting to fetch push tokens for ${mobileUserIds.length} mobile user(s)`);
      pushTokens = await getPushTokensForUsers(mobileUserIds);
      
      if (pushTokens.length > 0) {
        console.log(`[PUSH NOTIFICATION] Sending to ${pushTokens.length} device(s):`, pushTokens);
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
      } else {
        console.log(`[PUSH NOTIFICATION] No push tokens available for ${mobileUserIds.length} mobile user(s). They may need to register their device tokens.`);
      }
    } else {
      console.log(`[NOTIFICATION] No mobile users found, skipping push notification lookup`);
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
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get recommendations message based on risk level
 * Returns a friendly, action-oriented message with randomized recommendations
 * so users don't always receive the same message
 */
async function getRecommendationMessage(riskLevel) {
  try {
    // Fetch ALL recommendations for this risk level
    const allRecommendations = await prisma.recommendation.findMany({
      where: { 
        risk: riskLevel.toLowerCase()
      }
    });

    if (allRecommendations.length > 0) {
      // Shuffle recommendations to get random ones each time
      const shuffled = shuffleArray(allRecommendations);
      
      // Pick 2 random recommendations
      const selectedRecommendations = shuffled.slice(0, 2);
      const primaryRecommendation = selectedRecommendations[0];
      const secondaryRecommendation = selectedRecommendations.length > 1 ? selectedRecommendations[1] : null;
      
      // Create concise message for push notification (max ~100 chars for body)
      let message = primaryRecommendation.title;
      if (secondaryRecommendation && message.length < 60) {
        message += `. Also: ${secondaryRecommendation.title}`;
      }
      
      // Vary the title slightly based on day of week for more variety
      const dayOfWeek = new Date().getDay();
      const titles = [
        'Daily Health Tips',
        'Today\'s Prevention Tips',
        'Health Reminder',
        'Dengue Prevention Tips',
        'Stay Protected Today',
        'Your Daily Health Guide',
        'Prevention Matters'
      ];
      const title = titles[dayOfWeek];
      
      return {
        title: title,
        message: message,
        recommendations: selectedRecommendations.map(r => ({ 
          title: r.title, 
          details: r.details,
          referenceLink: r.referenceLink 
        }))
      };
    } else {
      // Fallback messages if no recommendations found in database
      // Also randomize fallback messages
      const fallbackMessages = {
        high: [
          { title: 'Daily Health Tips', message: 'Take preventive measures: Clear stagnant water and use mosquito repellent to stay protected.' },
          { title: 'Stay Alert', message: 'High risk detected. Apply insect repellent and wear protective clothing when outdoors.' },
          { title: 'Prevention Reminder', message: 'Eliminate standing water around your home. Check flower pots, gutters, and containers.' }
        ],
        medium: [
          { title: 'Daily Health Tips', message: 'Stay vigilant: Keep your surroundings clean and check for standing water regularly.' },
          { title: 'Health Reminder', message: 'Moderate risk in your area. Maintain clean surroundings and use mosquito nets.' },
          { title: 'Prevention Tips', message: 'Check your home weekly for potential mosquito breeding sites.' }
        ],
        low: [
          { title: 'Daily Health Tips', message: 'Maintain good practices: Keep your area clean and stay hydrated for better health.' },
          { title: 'Wellness Tip', message: 'Great job keeping risk low! Continue your preventive habits and stay healthy.' },
          { title: 'Health Reminder', message: 'Low risk today. Keep up the good work with regular cleaning routines.' }
        ]
      };
      
      const levelMessages = fallbackMessages[riskLevel.toLowerCase()] || fallbackMessages.low;
      const randomIndex = Math.floor(Math.random() * levelMessages.length);
      return levelMessages[randomIndex];
    }
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to fetch recommendations:', error);
    // Return safe fallback message with some variety
    const fallbacks = [
      { title: 'Daily Health Tips', message: 'Stay proactive with preventive measures to maintain a healthy environment.' },
      { title: 'Health Reminder', message: 'Keep your surroundings clean and mosquito-free for better health.' },
      { title: 'Prevention Tips', message: 'A clean environment is key to preventing mosquito-borne diseases.' }
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
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
    let pushTokensCount = 0;
    if (!userId) {
      console.log(`[NOTIFICATION] No userId provided for daily prediction notification, skipping push notification`);
    } else {
      console.log(`[NOTIFICATION] Attempting to fetch push tokens for user ${userId}`);
      const pushTokens = await getPushTokensForUsers([userId]);
      pushTokensCount = pushTokens.length;
      
      if (pushTokens.length > 0) {
        console.log(`[PUSH NOTIFICATION] Sending daily recommendation to ${pushTokens.length} device(s) for user ${userId}`);
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
      } else {
        console.log(`[PUSH NOTIFICATION] No push tokens available for user ${userId}. User may need to register their device token.`);
      }
    }

    console.log(`[NOTIFICATION] Sent daily recommendation notification to user ${userId || 'unknown'} (${pushTokensCount} push notifications)`);
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

