const prisma = require('../prisma/client');

// GET /companies/:id - Get company with settings
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Log for debugging
    console.log('[GET COMPANY] Request details:', {
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
      console.error('[GET COMPANY ERROR] No companyId in token');
      return res.status(403).json({ error: 'Access denied. No company associated with your account.' });
    }
    
    if (tokenCompanyId !== requestedId) {
      console.error('[GET COMPANY ERROR] Company ID mismatch:', {
        tokenCompanyId,
        requestedId
      });
      return res.status(403).json({ error: 'Access denied. You can only view your own company.' });
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
      return res.status(404).json({ error: 'Company not found.' });
    }
    
    res.json(company);
  } catch (err) {
    console.error('[GET COMPANY ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch company.' });
  }
};

// PATCH /companies/:id/settings - Update company settings
exports.updateCompanySettings = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the user can access this company
    if (req.companyId !== id) {
      return res.status(403).json({ error: 'Access denied. You can only update your own company.' });
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
    
    console.log('[UPDATE COMPANY SETTINGS] Request received:', {
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
      return res.status(400).json({ error: 'Invalid alertFrequency. Must be "immediate", "daily", or "weekly".' });
    }
    
    // Validate alertThreshold if provided
    if (alertThreshold && !['low', 'medium', 'high'].includes(alertThreshold)) {
      return res.status(400).json({ error: 'Invalid alertThreshold. Must be "low", "medium", or "high".' });
    }
    
    // Validate syncMode if provided
    if (syncMode && !['automatic', 'manual'].includes(syncMode)) {
      return res.status(400).json({ error: 'Invalid syncMode. Must be "automatic" or "manual".' });
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
      return res.status(400).json({ error: 'No settings provided to update.' });
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
    
    console.log('[UPDATE COMPANY SETTINGS] Update successful:', company);
    res.json(company);
  } catch (err) {
    console.error('[UPDATE COMPANY SETTINGS ERROR]', err);
    res.status(500).json({ error: 'Failed to update company settings.' });
  }
};

