const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendUnauthorizedError,
  sendInternalError
} = require('../utils/errorResponse');

/**
 * Register device token for push notifications
 * POST /api/notifications/register-device
 */
async function registerDevice(req, res) {
  try {
    // Extract from auth middleware-populated req.user
    const userId = req.user?.userId;
    const companyId = req.user?.companyId;
    const { pushToken, platform } = req.body;

    logger.debug('[REGISTER DEVICE TOKEN] Request received', {
      userId,
      companyId,
      platform,
      pushTokenLength: pushToken?.length,
      hasUser: !!req.user,
    });

    if (!pushToken) {
      logger.warn('[REGISTER DEVICE TOKEN] Missing pushToken');
      return sendValidationError(res, ['Push token is required']);
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      logger.warn('[REGISTER DEVICE TOKEN] Invalid platform', { platform });
      return sendValidationError(res, ['Valid platform (ios/android) is required']);
    }

    // Ensure we have a user id from token
    if (!userId) {
      logger.warn('[REGISTER DEVICE TOKEN] Missing userId from token', { user: req.user, hasUser: !!req.user });
      return sendUnauthorizedError(res, 'UserId not found in token');
    }

    // Check if token already exists for this user
    const existingToken = await prisma.deviceToken.findFirst({
      where: {
        userId,
        pushToken
      }
    });

    if (existingToken) {
      // Update existing token
      logger.debug('[REGISTER DEVICE TOKEN] Updating existing token', { tokenId: existingToken.id });
      const updated = await prisma.deviceToken.update({
        where: { id: existingToken.id },
        data: {
          platform,
          isActive: true,
          updatedAt: new Date()
        }
      });
      logger.debug('[REGISTER DEVICE TOKEN] Token updated successfully');
      return res.json({ success: true, deviceToken: updated });
    }

    // Create new device token
    logger.debug('[REGISTER DEVICE TOKEN] Creating new device token');
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId,
        pushToken,
        platform,
        isActive: true
      }
    });

    logger.debug('[REGISTER DEVICE TOKEN] Token created successfully', { tokenId: deviceToken.id });
    res.json({ success: true, deviceToken });
  } catch (error) {
    logger.error('[REGISTER DEVICE TOKEN ERROR]', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      platform: req.body?.platform,
    });
    return sendInternalError(res, 'Failed to register device token', error);
  }
}

/**
 * Unregister device token
 * POST /api/notifications/unregister-device
 */
async function unregisterDevice(req, res) {
  try {
    const { userId } = req;
    const { pushToken } = req.body;

    if (!pushToken) {
      return sendValidationError(res, ['Push token is required']);
    }

    // Deactivate or delete device token
    const deviceToken = await prisma.deviceToken.findFirst({
      where: {
        userId,
        pushToken
      }
    });

    if (deviceToken) {
      await prisma.deviceToken.update({
        where: { id: deviceToken.id },
        data: { isActive: false }
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('[UNREGISTER DEVICE TOKEN ERROR]', { error: error.message, stack: error.stack, userId: req.user?.userId });
    return sendInternalError(res, 'Failed to unregister device token', error);
  }
}

/**
 * Get device tokens for a user
 * GET /api/notifications/device-tokens
 */
async function getDeviceTokens(req, res) {
  try {
    const { userId } = req;

    const tokens = await prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true
      }
    });

    res.json({ tokens });
  } catch (error) {
    logger.error('[GET DEVICE TOKENS ERROR]', { error: error.message, stack: error.stack, userId: req.user?.userId });
    return sendInternalError(res, 'Failed to get device tokens', error);
  }
}

module.exports = {
  registerDevice,
  unregisterDevice,
  getDeviceTokens
};

