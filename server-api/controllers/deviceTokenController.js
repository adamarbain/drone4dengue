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

    if (!pushToken) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      return res.status(400).json({ error: 'Valid platform (ios/android) is required' });
    }

    // Ensure we have a user id from token
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
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
      const updated = await prisma.deviceToken.update({
        where: { id: existingToken.id },
        data: {
          platform,
          isActive: true,
          updatedAt: new Date()
        }
      });
      return res.json({ success: true, deviceToken: updated });
    }

    // Create new device token
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId,
        pushToken,
        platform,
        isActive: true
      }
    });

    res.json({ success: true, deviceToken });
  } catch (error) {
    console.error('[REGISTER DEVICE TOKEN ERROR]', error);
    res.status(500).json({ error: 'Failed to register device token' });
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

