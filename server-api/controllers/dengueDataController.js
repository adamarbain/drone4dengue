const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Parser } = require('json2csv');
const fs = require('fs');
const parse = require('csv-parse');

// Get all dengue data (with filters)
async function getAll(req, res) {
  try {
    const { location, date, status } = req.query;
    
    // Get company locations for the company
    const companyLocations = await prisma.companyLocation.findMany({
      where: { companyId: req.companyId },
      select: { id: true }
    });
    const locationIds = companyLocations.map(loc => loc.id);
    
    const where = { companyLocationId: { in: locationIds } }; // Filter by company locations
    if (location) where.location = location;
    if (status) where.status = status;
    if (date) where.date = new Date(date);
    
    const data = await prisma.dengueData.findMany({ 
      where, 
      include: {
        companyLocation: {
          select: { name: true, address: true }
        }
      },
      orderBy: { date: 'desc' } 
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get one dengue data record
async function getOne(req, res) {
  try {
    const { id } = req.params;
    const record = await prisma.dengueData.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create a new dengue data record
async function create(req, res) {
  try {
    const { companyLocationId, ...otherData } = req.body;
    
    if (!companyLocationId) {
      return res.status(400).json({ error: 'companyLocationId is required.' });
    }
    
    // Verify the companyLocationId belongs to the company
    const companyLocation = await prisma.companyLocation.findFirst({
      where: { 
        id: companyLocationId,
        companyId: req.companyId 
      }
    });
    
    if (!companyLocation) {
      return res.status(400).json({ error: 'Invalid company location ID or location does not belong to your company.' });
    }
    
    const data = { ...otherData, companyLocationId };
    const record = await prisma.dengueData.create({ data });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Update a dengue data record
async function update(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    const record = await prisma.dengueData.update({ where: { id }, data });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Delete a dengue data record
async function remove(req, res) {
  try {
    const { id } = req.params;
    await prisma.dengueData.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Upload CSV and import dengue data
async function uploadCSV(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const { companyLocationId } = req.body;
  if (!companyLocationId) {
    return res.status(400).json({ error: 'companyLocationId is required.' });
  }
  
  // Verify the companyLocationId belongs to the company
  const companyLocation = await prisma.companyLocation.findFirst({
    where: { 
      id: companyLocationId,
      companyId: req.companyId 
    }
  });
  
  if (!companyLocation) {
    return res.status(400).json({ error: 'Invalid company location ID or location does not belong to your company.' });
  }
  
  const filePath = req.file.path;
  const results = [];
  const errors = [];
  try {
    const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, trim: true }));
    for await (const row of parser) {
      try {
        // Map and validate fields
        const data = {
          date: new Date(row.date),
          location: row.location,
          activeCases: parseInt(row.activeCases) || 0,
          totalCases: parseInt(row.totalCases) || 0,
          coverageArea: row.coverageArea || '',
          status: row.status || 'Processing',
          source: row.source || 'csv',
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null,
          companyLocationId,
        };
        await prisma.dengueData.create({ data });
        results.push(data);
      } catch (err) {
        errors.push({ row, error: err.message });
      }
    }
    fs.unlink(filePath, () => {}); // Clean up uploaded file
    res.json({ imported: results.length, errors });
  } catch (err) {
    fs.unlink(filePath, () => {});
    res.status(500).json({ error: err.message });
  }
}

// Get summary stats
async function getSummary(req, res) {
  try {
    // Get company locations for the company
    const companyLocations = await prisma.companyLocation.findMany({
      where: { companyId: req.companyId },
      select: { id: true }
    });
    const locationIds = companyLocations.map(loc => loc.id);
    const where = { companyLocationId: { in: locationIds } };
    
    const totalRecords = await prisma.dengueData.count({ where });
    const activeCases = await prisma.dengueData.aggregate({ where, _sum: { activeCases: true } });
    const locations = await prisma.dengueData.findMany({ 
      where, 
      select: { location: true }, 
      distinct: ['location'] 
    });
    // Data accuracy is mocked for now
    res.json({
      totalRecords,
      activeCases: activeCases._sum.activeCases || 0,
      locationsCovered: locations.length,
      dataAccuracy: 98.5
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get historical trend data
async function getHistorical(req, res) {
  try {
    // Get company locations for the company
    const companyLocations = await prisma.companyLocation.findMany({
      where: { companyId: req.companyId },
      select: { id: true }
    });
    const locationIds = companyLocations.map(loc => loc.id);
    
    const data = await prisma.dengueData.findMany({
      where: { companyLocationId: { in: locationIds } },
      select: { date: true, totalCases: true, activeCases: true },
      orderBy: { date: 'asc' },
    });
    // Group by date
    const trends = {};
    data.forEach(row => {
      const d = row.date.toISOString().split('T')[0];
      if (!trends[d]) trends[d] = { date: d, totalCases: 0, activeCases: 0 };
      trends[d].totalCases += row.totalCases;
      trends[d].activeCases += row.activeCases;
    });
    res.json(Object.values(trends));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get map data
async function getMapData(req, res) {
  try {
    // Get company locations for the company
    const companyLocations = await prisma.companyLocation.findMany({
      where: { companyId: req.companyId },
      select: { id: true }
    });
    const locationIds = companyLocations.map(loc => loc.id);
    
    const data = await prisma.dengueData.findMany({
      where: { companyLocationId: { in: locationIds } },
      select: {
        id: true,
        location: true,
        latitude: true,
        longitude: true,
        totalCases: true,
        activeCases: true,
        status: true,
      },
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Export data as CSV
async function exportData(req, res) {
  try {
    const { location, date, status } = req.query;
    
    // Get company locations for the company
    const companyLocations = await prisma.companyLocation.findMany({
      where: { companyId: req.companyId },
      select: { id: true }
    });
    const locationIds = companyLocations.map(loc => loc.id);
    
    const where = { companyLocationId: { in: locationIds } };
    if (location) where.location = location;
    if (status) where.status = status;
    if (date) where.date = new Date(date);
    const data = await prisma.dengueData.findMany({ where });
    const fields = ['id', 'location', 'date', 'activeCases', 'totalCases', 'coverageArea', 'status', 'source', 'latitude', 'longitude', 'createdAt', 'updatedAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('dengue_data_export.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  uploadCSV,
  getSummary,
  getHistorical,
  getMapData,
  exportData,
}; 