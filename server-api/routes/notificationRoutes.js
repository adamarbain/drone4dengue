const express = require('express');
const router = express.Router();
const { checkToken, checkRole } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  sendBroadcastNotification
} = require('../controllers/notificationController');
const {
  registerDevice,
  unregisterDevice,
  getDeviceTokens
} = require('../controllers/deviceTokenController');

// All routes require authentication
router.use(checkToken);

// Get notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

// Device token management
router.post('/register-device', registerDevice);
router.post('/unregister-device', unregisterDevice);
router.get('/device-tokens', getDeviceTokens);

// Broadcast notification to all mobile app users (admin only)
router.post('/broadcast', checkToken, checkRole('admin'), sendBroadcastNotification);

module.exports = router;

