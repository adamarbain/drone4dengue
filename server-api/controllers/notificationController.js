const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
 * Get notifications for a user
 * GET /api/notifications
 */
async function getNotifications(req, res) {
  try {
    const { userId, companyId } = req;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

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

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.notification.count({ where })
    ]);

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
    const { userId, companyId } = req;

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
    const { userId, companyId } = req;

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
    const { userId, companyId } = req;

    const count = await prisma.notification.count({
      where: {
        companyId,
        isRead: false,
        OR: [
          { userId: null },
          { userId }
        ]
      }
    });

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
    const { userId, companyId } = req;

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

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
};

