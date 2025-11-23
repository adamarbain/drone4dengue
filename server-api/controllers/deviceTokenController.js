const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    console.log('[REGISTER DEVICE TOKEN] Request received:', {
      userId,
      companyId,
      platform,
      pushTokenLength: pushToken?.length,
      hasUser: !!req.user,
    });

    if (!pushToken) {
      console.error('[REGISTER DEVICE TOKEN] Missing pushToken');
      return res.status(400).json({ error: 'Push token is required' });
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      console.error('[REGISTER DEVICE TOKEN] Invalid platform:', platform);
      return res.status(400).json({ error: 'Valid platform (ios/android) is required' });
    }

    // Ensure we have a user id from token
    if (!userId) {
      console.error('[REGISTER DEVICE TOKEN] Missing userId from token:', {
        user: req.user,
        hasUser: !!req.user,
      });
      return res.status(401).json({ error: 'Unauthorized - userId not found in token' });
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
      console.log('[REGISTER DEVICE TOKEN] Updating existing token:', existingToken.id);
      const updated = await prisma.deviceToken.update({
        where: { id: existingToken.id },
        data: {
          platform,
          isActive: true,
          updatedAt: new Date()
        }
      });
      console.log('[REGISTER DEVICE TOKEN] Token updated successfully');
      return res.json({ success: true, deviceToken: updated });
    }

    // Create new device token
    console.log('[REGISTER DEVICE TOKEN] Creating new device token');
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId,
        pushToken,
        platform,
        isActive: true
      }
    });

    console.log('[REGISTER DEVICE TOKEN] Token created successfully:', deviceToken.id);
    res.json({ success: true, deviceToken });
  } catch (error) {
    console.error('[REGISTER DEVICE TOKEN ERROR]', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      platform: req.body?.platform,
    });
    res.status(500).json({ error: 'Failed to register device token', details: error.message });
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
      return res.status(400).json({ error: 'Push token is required' });
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
    console.error('[UNREGISTER DEVICE TOKEN ERROR]', error);
    res.status(500).json({ error: 'Failed to unregister device token' });
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
    console.error('[GET DEVICE TOKENS ERROR]', error);
    res.status(500).json({ error: 'Failed to get device tokens' });
  }
}

module.exports = {
  registerDevice,
  unregisterDevice,
  getDeviceTokens
};

