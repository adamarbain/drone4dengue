const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendPushNotification, createNotification } = require('../services/notificationService');
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendInternalError
} = require('../utils/errorResponse');

/**
 * Get notifications for a user
 * GET /api/notifications
 */
async function getNotifications(req, res) {
  try {
    const userId = req.user?.userId;
    const companyId = req.companyId || req.user?.companyId;
    const { limit = 50, offset = 0, unreadOnly = false, readStatus, type } = req.query;

    // Validate required fields
    if (!companyId) {
      logger.warn('[GET NOTIFICATIONS ERROR] Missing companyId', { user: req.user, companyId: req.companyId });
      return sendValidationError(res, ['Company ID is required']);
    }

    if (!userId) {
      logger.warn('[GET NOTIFICATIONS ERROR] Missing userId', { user: req.user });
      return sendValidationError(res, ['User ID is required']);
    }

    const where = {
      companyId,
      OR: [
        { userId: null }, // Company-wide notifications
        { userId } // User-specific notifications
      ]
    };

    // Filter by read status
    if (unreadOnly === 'true' || readStatus === 'unread') {
      where.isRead = false;
    } else if (readStatus === 'read') {
      where.isRead = true;
    }
    // If readStatus is 'all' or not provided, show all (no filter)

    // Filter by notification type
    if (type && type !== 'all') {
      where.type = type;
    }

    // console.log('[GET NOTIFICATIONS] Query params:', { userId, companyId, limit, offset, unreadOnly });
    // console.log('[GET NOTIFICATIONS] Where clause:', JSON.stringify(where, null, 2));

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.notification.count({ where })
    ]);

    // console.log('[GET NOTIFICATIONS] Found notifications:', notifications.length, 'Total:', total);

    res.json({
      notifications,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('[GET NOTIFICATIONS ERROR]', { error: error.message, stack: error.stack, userId, companyId });
    return sendInternalError(res, 'Failed to fetch notifications', error);
  }
}

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const companyId = req.companyId || req.user?.companyId;

    // Verify notification belongs to user's company
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        companyId,
        OR: [
          { userId: null },
          { userId }
        ]
      }
    });

    if (!notification) {
      return sendNotFoundError(res, 'Notification');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    logger.error('[MARK NOTIFICATION READ ERROR]', { error: error.message, stack: error.stack, notificationId: req.params.id });
    return sendInternalError(res, 'Failed to mark notification as read', error);
  }
}

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.user?.userId;
    const companyId = req.companyId || req.user?.companyId;

    const where = {
      companyId,
      isRead: false,
      OR: [
        { userId: null },
        { userId }
      ]
    };

    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ updated: result.count });
  } catch (error) {
    logger.error('[MARK ALL NOTIFICATIONS READ ERROR]', { error: error.message, stack: error.stack, userId, companyId });
    return sendInternalError(res, 'Failed to mark all notifications as read', error);
  }
}

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.user?.userId;
    const companyId = req.companyId || req.user?.companyId;

    // Validate required fields
    if (!companyId) {
      logger.warn('[GET UNREAD COUNT ERROR] Missing companyId', { user: req.user, companyId: req.companyId });
      return sendValidationError(res, ['Company ID is required']);
    }

    if (!userId) {
      logger.warn('[GET UNREAD COUNT ERROR] Missing userId', { user: req.user });
      return sendValidationError(res, ['User ID is required']);
    }

    const where = {
      companyId,
      isRead: false,
      OR: [
        { userId: null },
        { userId }
      ]
    };

    logger.debug('[GET UNREAD COUNT] Query params', { userId, companyId });
    logger.debug('[GET UNREAD COUNT] Where clause', { where });

    const count = await prisma.notification.count({ where });

    logger.debug('[GET UNREAD COUNT] Unread count', { count });

    res.json({ count });
  } catch (error) {
    logger.error('[GET UNREAD COUNT ERROR]', { error: error.message, stack: error.stack, userId, companyId });
    return sendInternalError(res, 'Failed to get unread count', error);
  }
}

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const companyId = req.companyId || req.user?.companyId;

    // Verify notification belongs to user's company
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        companyId,
        OR: [
          { userId: null },
          { userId }
        ]
      }
    });

    if (!notification) {
      return sendNotFoundError(res, 'Notification');
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('[DELETE NOTIFICATION ERROR]', { error: error.message, stack: error.stack, notificationId: req.params.id });
    return sendInternalError(res, 'Failed to delete notification', error);
  }
}

/**
 * Send broadcast push notification to all mobile app users
 * POST /api/notifications/broadcast
 * Requires admin role
 */
async function sendBroadcastNotification(req, res) {
  try {
    const { title, message, type = 'broadcast', metadata = {} } = req.body;

    // Validate required fields
    if (!title || !message) {
      return sendValidationError(res, ['Title and message are required']);
    }

    // Get all active device tokens from all users
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        isActive: true
      },
      select: {
        pushToken: true,
        userId: true
      }
    });

    if (deviceTokens.length === 0) {
      return sendErrorResponse(res, 404, 'No active device tokens found', 'NO_DEVICE_TOKENS', { sent: 0, total: 0 });
    }

    // Extract push tokens
    const pushTokens = deviceTokens.map(dt => dt.pushToken);

    // Send push notifications to all tokens
    await sendPushNotification(pushTokens, {
      title,
      message,
      type,
      metadata
    });

    // Get unique user IDs and company IDs to create notification records
    const userIds = [...new Set(deviceTokens.map(dt => dt.userId))];
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        companyId: true
      }
    });

    // Group users by company
    const companyUserMap = {};
    users.forEach(user => {
      if (!companyUserMap[user.companyId]) {
        companyUserMap[user.companyId] = [];
      }
      companyUserMap[user.companyId].push(user.id);
    });

    // Create company-wide notifications for each company
    const notificationPromises = Object.entries(companyUserMap).map(([companyId, userIds]) =>
      createNotification({
        title,
        message,
        type,
        companyId,
        userIds: null, // Company-wide notification
        metadata
      })
    );

    await Promise.all(notificationPromises);

    logger.info('[BROADCAST NOTIFICATION] Sent', { 
      tokensSent: pushTokens.length, 
      companies: Object.keys(companyUserMap).length 
    });

    res.json({
      success: true,
      sent: pushTokens.length,
      total: pushTokens.length,
      companies: Object.keys(companyUserMap).length,
      message: `Broadcast notification sent to ${pushTokens.length} devices`
    });
  } catch (error) {
    logger.error('[BROADCAST NOTIFICATION ERROR]', { error: error.message, stack: error.stack });
    return sendInternalError(res, 'Failed to send broadcast notification', error);
  }
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  sendBroadcastNotification
};

