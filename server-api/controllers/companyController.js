const prisma = require('../prisma/client');
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendForbiddenError,
  sendInternalError
} = require('../utils/errorResponse');

// GET /companies/:id - Get company with settings
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Log for debugging
    logger.debug('[GET COMPANY] Request details', {
      requestedCompanyId: id,
      tokenCompanyId: req.companyId,
      userId: req.user?.userId,
      userRole: req.user?.role
    });
    
    // Verify the user can access this company
    // Convert both to strings for comparison to handle type mismatches
    const tokenCompanyId = String(req.companyId || '');
    const requestedId = String(id || '');
    
    if (!req.companyId) {
      logger.warn('[GET COMPANY ERROR] No companyId in token');
      return sendForbiddenError(res, 'No company associated with your account');
    }
    
    if (tokenCompanyId !== requestedId) {
      logger.warn('[GET COMPANY ERROR] Company ID mismatch', { tokenCompanyId, requestedId });
      return sendForbiddenError(res, 'You can only view your own company');
    }
    
    const company = await prisma.company.findUnique({
      where: { 
        id: id,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        // Notification Preferences
        emailNotifications: true,
        smsNotifications: true,
        alertFrequency: true,
        // System Configuration
        alertThreshold: true,
        predictionModelParameters: true,
        syncMode: true,
        // Advanced Settings
        advancedSettings: true,
      }
    });
    
    if (!company) {
      return sendNotFoundError(res, 'Company');
    }
    
    res.json(company);
  } catch (err) {
    logger.error('[GET COMPANY ERROR]', { error: err.message, stack: err.stack, companyId: req.params.id });
    return sendInternalError(res, 'Failed to fetch company', err);
  }
};

// PATCH /companies/:id/settings - Update company settings
exports.updateCompanySettings = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the user can access this company
    if (req.companyId !== id) {
      return sendForbiddenError(res, 'You can only update your own company');
    }
    
    const {
      // Notification Preferences
      emailNotifications,
      smsNotifications,
      alertFrequency,
      // System Configuration
      alertThreshold,
      predictionModelParameters,
      syncMode,
      // Advanced Settings
      advancedSettings,
    } = req.body;
    
    logger.debug('[UPDATE COMPANY SETTINGS] Request received', {
      companyId: id,
      settings: {
        emailNotifications,
        smsNotifications,
        alertFrequency,
        alertThreshold,
        predictionModelParameters,
        syncMode,
        advancedSettings,
      }
    });
    
    // Validate alertFrequency if provided
    if (alertFrequency && !['immediate', 'daily', 'weekly'].includes(alertFrequency)) {
      return sendValidationError(res, ['Invalid alertFrequency. Must be "immediate", "daily", or "weekly"']);
    }
    
    // Validate alertThreshold if provided
    if (alertThreshold && !['low', 'medium', 'high'].includes(alertThreshold)) {
      return sendValidationError(res, ['Invalid alertThreshold. Must be "low", "medium", or "high"']);
    }
    
    // Validate syncMode if provided
    if (syncMode && !['automatic', 'manual'].includes(syncMode)) {
      return sendValidationError(res, ['Invalid syncMode. Must be "automatic" or "manual"']);
    }
    
    // Build update data object
    const updateData = {};
    
    if (emailNotifications !== undefined) updateData.emailNotifications = Boolean(emailNotifications);
    if (smsNotifications !== undefined) updateData.smsNotifications = Boolean(smsNotifications);
    if (alertFrequency !== undefined) updateData.alertFrequency = alertFrequency;
    if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold;
    if (predictionModelParameters !== undefined) updateData.predictionModelParameters = predictionModelParameters;
    if (syncMode !== undefined) updateData.syncMode = syncMode;
    if (advancedSettings !== undefined) updateData.advancedSettings = advancedSettings;
    
    if (Object.keys(updateData).length === 0) {
      return sendValidationError(res, ['No settings provided to update']);
    }
    
    const company = await prisma.company.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        // Notification Preferences
        emailNotifications: true,
        smsNotifications: true,
        alertFrequency: true,
        // System Configuration
        alertThreshold: true,
        predictionModelParameters: true,
        syncMode: true,
        // Advanced Settings
        advancedSettings: true,
      }
    });
    
    logger.debug('[UPDATE COMPANY SETTINGS] Update successful', { companyId: company.id });
    res.json(company);
  } catch (err) {
    logger.error('[UPDATE COMPANY SETTINGS ERROR]', { error: err.message, stack: err.stack, companyId: req.params.id });
    return sendInternalError(res, 'Failed to update company settings', err);
  }
};

