const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendPushNotification, createNotification } = require('../services/notificationService');

/**
 * Get notifications for a user
 * GET /api/notifications
 */
async function getNotifications(req, res) {
  try {
    const userId = req.user?.userId;
    const companyId = req.companyId || req.user?.companyId;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    // Validate required fields
    if (!companyId) {
      console.error('[GET NOTIFICATIONS ERROR] Missing companyId. req.user:', req.user, 'req.companyId:', req.companyId);
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!userId) {
      console.error('[GET NOTIFICATIONS ERROR] Missing userId. req.user:', req.user);
      return res.status(400).json({ error: 'User ID is required' });
    }

    const where = {
      companyId,
      OR: [
        { userId: null }, // Company-wide notifications
        { userId } // User-specific notifications
      ]
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
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
    console.error('[GET NOTIFICATIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
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
      return res.status(404).json({ error: 'Notification not found' });
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
    console.error('[MARK NOTIFICATION READ ERROR]', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
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
    console.error('[MARK ALL NOTIFICATIONS READ ERROR]', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
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
      console.error('[GET UNREAD COUNT ERROR] Missing companyId. req.user:', req.user, 'req.companyId:', req.companyId);
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!userId) {
      console.error('[GET UNREAD COUNT ERROR] Missing userId. req.user:', req.user);
      return res.status(400).json({ error: 'User ID is required' });
    }

    const where = {
      companyId,
      isRead: false,
      OR: [
        { userId: null },
        { userId }
      ]
    };

    console.log('[GET UNREAD COUNT] Query params:', { userId, companyId });
    console.log('[GET UNREAD COUNT] Where clause:', JSON.stringify(where, null, 2));

    const count = await prisma.notification.count({ where });

    console.log('[GET UNREAD COUNT] Unread count:', count);

    res.json({ count });
  } catch (error) {
    console.error('[GET UNREAD COUNT ERROR]', error);
    res.status(500).json({ error: 'Failed to get unread count' });
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
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE NOTIFICATION ERROR]', error);
    res.status(500).json({ error: 'Failed to delete notification' });
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
      return res.status(400).json({ error: 'Title and message are required' });
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
      return res.status(404).json({ 
        error: 'No active device tokens found',
        sent: 0,
        total: 0
      });
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

    console.log(`[BROADCAST NOTIFICATION] Sent to ${pushTokens.length} device tokens across ${Object.keys(companyUserMap).length} companies`);

    res.json({
      success: true,
      sent: pushTokens.length,
      total: pushTokens.length,
      companies: Object.keys(companyUserMap).length,
      message: `Broadcast notification sent to ${pushTokens.length} devices`
    });
  } catch (error) {
    console.error('[BROADCAST NOTIFICATION ERROR]', error);
    res.status(500).json({ error: 'Failed to send broadcast notification' });
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

