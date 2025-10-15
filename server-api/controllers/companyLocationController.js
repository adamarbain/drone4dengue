const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create a new company location
async function create(req, res) {
  try {
    const { name, address, latitude, longitude } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
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
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'A location with this name already exists for your company.' });
    } else {
      res.status(400).json({ error: err.message });
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
      return res.status(404).json({ error: 'Location not found' });
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
    
    res.json(location);
  } catch (err) {
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'A location with this name already exists for your company.' });
    } else {
      res.status(400).json({ error: err.message });
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
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Check if location has associated data
    const [weatherCount, dengueCount] = await Promise.all([
      prisma.weather.count({ where: { companyLocationId: id } }),
      prisma.dengueData.count({ where: { companyLocationId: id } })
    ]);
    
    if (weatherCount > 0 || dengueCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete location with associated weather or dengue data. Please delete the data first or deactivate the location instead.' 
      });
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
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const location = await prisma.companyLocation.update({
      where: { id },
      data: { isActive: !existingLocation.isActive }
    });
    
    res.json(location);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
