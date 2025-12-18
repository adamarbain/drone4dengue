const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalError
} = require('../utils/errorResponse');

// Get all company locations for a company
async function getAll(req, res) {
  try {
    const locations = await prisma.companyLocation.findMany({
      where: { companyId: req.companyId },
      orderBy: { name: 'asc' }
    });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get one company location
async function getOne(req, res) {
  try {
    const { id } = req.params;
    const location = await prisma.companyLocation.findFirst({
      where: { 
        id,
        companyId: req.companyId 
      }
    });
    if (!location) return sendNotFoundError(res, 'Location');
    res.json(location);
  } catch (err) {
    logger.error('[GET COMPANY LOCATION ERROR]', { error: err.message, stack: err.stack, locationId: req.params.id });
    return sendInternalError(res, 'Failed to fetch company location', err);
  }
}

// Create a new company location
async function create(req, res) {
  try {
    const { name, address, latitude, longitude } = req.body;
    
    if (!name) {
      return sendValidationError(res, ['Name is required']);
    }
    
    const location = await prisma.companyLocation.create({
      data: {
        name,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        companyId: req.companyId
      }
    });
    
    res.status(201).json(location);
  } catch (err) {
    logger.error('[CREATE COMPANY LOCATION ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    if (err.code === 'P2002') {
      return sendConflictError(res, 'A location with this name already exists for your company');
    } else {
      return sendInternalError(res, 'Failed to create company location', err);
    }
  }
}

// Update a company location
async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, isActive } = req.body;
    
    // Check if location exists and belongs to company
    const existingLocation = await prisma.companyLocation.findFirst({
      where: { 
        id,
        companyId: req.companyId 
      }
    });
    
    if (!existingLocation) {
      return sendNotFoundError(res, 'Location');
    }
    
    const location = await prisma.companyLocation.update({
      where: { id },
      data: {
        name,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isActive: isActive !== undefined ? isActive : existingLocation.isActive
      }
    });
    
    // Send notification to admin users
    try {
      const { notifyCompanyLocationChange } = require('../services/notificationService');
      await notifyCompanyLocationChange(location, 'updated');
    } catch (notifError) {
      logger.error('Failed to send location notification', { error: notifError.message });
      // Don't fail the request if notification fails
    }
    
    res.json(location);
  } catch (err) {
    logger.error('[CREATE COMPANY LOCATION ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    if (err.code === 'P2002') {
      return sendConflictError(res, 'A location with this name already exists for your company');
    } else {
      return sendInternalError(res, 'Failed to create company location', err);
    }
  }
}

// Delete a company location
async function remove(req, res) {
  try {
    const { id } = req.params;
    
    // Check if location exists and belongs to company
    const existingLocation = await prisma.companyLocation.findFirst({
      where: { 
        id,
        companyId: req.companyId 
      }
    });
    
    if (!existingLocation) {
      return sendNotFoundError(res, 'Location');
    }
    
    // Check if location has associated data
    const [weatherCount, dengueCount] = await Promise.all([
      prisma.weather.count({ where: { companyLocationId: id } }),
      prisma.dengueData.count({ where: { companyLocationId: id } })
    ]);
    
    if (weatherCount > 0 || dengueCount > 0) {
      return sendErrorResponse(res, 400, 
        'Cannot delete location with associated weather or dengue data. Please delete the data first or deactivate the location instead.',
        'LOCATION_HAS_DATA',
        { weatherCount, dengueCount }
      );
    }
    
    await prisma.companyLocation.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Toggle location active status
async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    
    const existingLocation = await prisma.companyLocation.findFirst({
      where: { 
        id,
        companyId: req.companyId 
      }
    });
    
    if (!existingLocation) {
      return sendNotFoundError(res, 'Location');
    }
    
    const location = await prisma.companyLocation.update({
      where: { id },
      data: { isActive: !existingLocation.isActive }
    });
    
    res.json(location);
  } catch (err) {
    logger.error('[TOGGLE LOCATION STATUS ERROR]', { error: err.message, stack: err.stack, locationId: req.params.id });
    return sendInternalError(res, 'Failed to toggle location status', err);
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  toggleStatus
};
