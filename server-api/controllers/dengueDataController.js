const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const parse = require('csv-parse');
const redis = require('redis');

// Redis client configuration
let redisClient = null;
let redisConnected = false;

// Initialize Redis client (similar to predictionController.js)
try {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        tls: redisUrl.startsWith('rediss://'),
      },
    });
  } else {
    redisClient = redis.createClient({
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    });
  }

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
    redisConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('Connected to Redis');
    redisConnected = true;
  });

  // Connect to Redis (non-blocking)
  redisClient.connect().catch((err) => {
    console.error('Redis connection failed:', err);
    redisConnected = false;
  });
} catch (error) {
  console.error('Failed to create Redis client:', error);
  redisConnected = false;
}

// Get all dengue data (with filters)
async function getAll(req, res) {
  try {
    const { location, date, status, startDate, endDate } = req.query;
    
    const where = { };
    if (location) where.location = location;
    if (status) where.status = status;
    if (date) where.date = new Date(date);
    
    // Support date range filtering
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the full end date (end of day)
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.date.lte = endDateTime;
      }
    }
    
    const data = await prisma.dengueData.findMany({ 
      where, 
      // include: {
      //   companyLocation: {
      //     select: { name: true, address: true }
      //   }
      // },
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
    
    // Send notification to admin users
    try {
      const { notifyDengueCaseAdded } = require('../services/notificationService');
      await notifyDengueCaseAdded({
        ...record,
        companyId: req.companyId
      });
    } catch (notifError) {
      console.error('Failed to send dengue case notification:', notifError);
      // Don't fail the request if notification fails
    }
    
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
        const record = await prisma.dengueData.create({ data });
        results.push(record);
        
        // Send notification to admin users for each record
        try {
          const { notifyDengueCaseAdded } = require('../services/notificationService');
          await notifyDengueCaseAdded({
            ...record,
            companyId: req.companyId
          });
        } catch (notifError) {
          console.error('Failed to send dengue case notification:', notifError);
          // Don't fail the request if notification fails
        }
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
    const where = { };
    
    const totalRecords = await prisma.dengueData.count({ where });
    const activeCases = await prisma.dengueData.count({ where: { status: 'Active Cases' } });
    const locations = await prisma.dengueData.findMany({ 
      where, 
      select: { location: true }, 
      distinct: ['location'] 
    });
    // Use hotspot count as requested
    const hotspotCount = await prisma.dengueData.count({ where: { status: 'Hotspot' } });
    res.json({
      totalRecords,
      activeCases: activeCases,
      locationsCovered: locations.length,
      hotspotCount: hotspotCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get historical trend data
async function getHistorical(req, res) {
  try {
  const data = await prisma.dengueData.findMany({
      where: { },
      select: { date: true, activeCases: true, status: true },
      orderBy: { date: 'asc' },
    });
    // Group by date
    const trends = {};
    data.forEach(row => {
      const d = row.date.toISOString().split('T')[0];
      if (!trends[d]) trends[d] = { date: d, activeCases: 0, hotspotCount: 0 };
      trends[d].activeCases += (row.activeCases || 0);
      if (row.status === 'Hotspot') trends[d].hotspotCount += 1;
    });
    res.json(Object.values(trends));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get map data
async function getMapData(req, res) {
  try {
    const data = await prisma.dengueData.findMany({
      where: { },
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

// Export data in multiple formats
async function exportData(req, res) {
  try {
    const { location, date, status, startDate, endDate, format = 'csv' } = req.query;
    
    const where = { };
    if (location) where.location = location;
    if (status) where.status = status;
    if (date) where.date = new Date(date);
    
    // Support date range filtering
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.date.lte = endDateTime;
      }
    }

    const exportFormat = (format || 'csv').toString().toLowerCase();
    const data = await prisma.dengueData.findMany({ where, orderBy: { date: 'asc' } });
    const safeDate = (value) => value ? new Date(value).toISOString().split('T')[0] : '';

    if (exportFormat === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Dengue Data');
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 26 },
        { header: 'Date', key: 'date', width: 18 },
        { header: 'Location', key: 'location', width: 24 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Active Cases', key: 'activeCases', width: 16 },
        { header: 'Total Cases', key: 'totalCases', width: 16 },
        { header: 'Coverage Area', key: 'coverageArea', width: 22 },
        { header: 'Source', key: 'source', width: 14 },
      ];
      data.forEach(record => {
        worksheet.addRow({
          id: record.id,
          date: safeDate(record.date),
          location: record.location || '',
          status: record.status || '',
          activeCases: record.activeCases ?? '',
          totalCases: record.totalCases ?? '',
          coverageArea: record.coverageArea || '',
          source: record.source || '',
        });
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="dengue_data_export.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    if (exportFormat === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="dengue_data_export.pdf"');
      doc.pipe(res);

      const dateRange = `${startDate || 'N/A'} - ${endDate || 'N/A'}`;
      doc.fontSize(18).text('Dengue Data Export', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Date Range: ${dateRange}`);
      doc.text(`Location: ${location || 'All locations'}`);
      doc.text(`Status: ${status || 'All statuses'}`);
      doc.text(`Total Records: ${data.length}`);
      doc.moveDown();

      const rows = data.slice(0, 50);
      rows.forEach(record => {
        doc.font('Helvetica-Bold').text(`${safeDate(record.date)} • ${record.location || 'N/A'}`);
        doc.font('Helvetica').text(
          `Status: ${record.status || '-'} | Active: ${record.activeCases ?? 0} | Total: ${record.totalCases ?? 0}`
        );
        if (record.coverageArea || record.source) {
          doc.fontSize(10).text(
            `Coverage: ${record.coverageArea || '-'} • Source: ${record.source || '-'}`
          );
        }
        doc.moveDown();
      });

      if (data.length > rows.length) {
        doc.font('Helvetica-Oblique').text(`+ ${data.length - rows.length} more records not shown to keep the PDF concise.`);
      }

      doc.end();
      return;
    }

    // Default CSV export
    const fields = ['id', 'location', 'date', 'activeCases', 'totalCases', 'coverageArea', 'status', 'source', 'latitude', 'longitude', 'createdAt', 'updatedAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('dengue_data_export.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export failed:', err);
    res.status(500).json({ error: err.message });
  }
}

// Get unique locations from dengue data
async function getLocations(req, res) {
  try {
    const allData = await prisma.dengueData.findMany({
      select: { location: true }
    });
    
    // Get unique locations (filter out empty strings)
    const uniqueLocations = [...new Set(allData.map(item => item.location).filter(loc => loc && loc.trim() !== ''))];
    uniqueLocations.sort();
    
    res.json(uniqueLocations);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: err.message });
  }
}

// Generate report data combining dengue data and predictions
async function generateReport(req, res) {
  try {
    const { startDate, endDate, dataType, companyId } = req.query;
    
    if (!startDate || !endDate || !dataType) {
      return res.status(400).json({ error: 'Missing required parameters: startDate, endDate, dataType' });
    }

    // Build date range filter
    const dateFilter = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };

    // Fetch dengue data
    const dengueData = await prisma.dengueData.findMany({
      where: {
        date: dateFilter,
      },
      orderBy: { date: 'asc' }
    });

    // Fetch company predictions if companyId is provided
    let predictions = [];
    if (companyId) {
      predictions = await prisma.companyPrediction.findMany({
        where: {
          companyId: companyId,
          createdAt: dateFilter
        },
        include: {
          companyLocation: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
    }

    // Calculate stats based on dataType
    let weeklyData = [];
    let totalValue = 0;
    let latestValue = 0;
    let trend = 'stable';

    if (dataType === 'Active Cases') {
      // Group by week
      const weeklyMap = {};
      dengueData.forEach(record => {
        const week = getWeekOfYear(record.date);
        const weekKey = `${week.year}-W${week.week}`;
        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { week: weekKey, value: 0, date: record.date };
        }
        weeklyMap[weekKey].value += (record.activeCases || 0);
      });
      weeklyData = Object.values(weeklyMap).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      totalValue = dengueData.reduce((sum, r) => sum + (r.activeCases || 0), 0);
      if (weeklyData.length > 0) {
        latestValue = weeklyData[weeklyData.length - 1].value;
        if (weeklyData.length > 1) {
          const prevValue = weeklyData[weeklyData.length - 2].value;
          trend = latestValue > prevValue ? 'up' : latestValue < prevValue ? 'down' : 'stable';
        }
      }
    } else if (dataType === 'Total Cases') {
      const weeklyMap = {};
      dengueData.forEach(record => {
        const week = getWeekOfYear(record.date);
        const weekKey = `${week.year}-W${week.week}`;
        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { week: weekKey, value: 0, date: record.date };
        }
        weeklyMap[weekKey].value += (record.totalCases || 0);
      });
      weeklyData = Object.values(weeklyMap).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      totalValue = dengueData.reduce((sum, r) => sum + (r.totalCases || 0), 0);
      if (weeklyData.length > 0) {
        latestValue = weeklyData[weeklyData.length - 1].value;
        if (weeklyData.length > 1) {
          const prevValue = weeklyData[weeklyData.length - 2].value;
          trend = latestValue > prevValue ? 'up' : latestValue < prevValue ? 'down' : 'stable';
        }
      }
    } else if (dataType === 'Coverage Area') {
      // For coverage area, count unique locations or use coverageArea field
      const uniqueAreas = new Set();
      dengueData.forEach(record => {
        if (record.coverageArea) {
          uniqueAreas.add(record.coverageArea);
        } else if (record.location) {
          uniqueAreas.add(record.location);
        }
      });
      totalValue = uniqueAreas.size;
      latestValue = totalValue;
    }

    // Calculate overall stats
    const stats = {
      totalDataPoints: dengueData.length,
      predictionsCount: predictions.length,
      averageRiskScore: predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + (p.riskScore || 0), 0) / predictions.length 
        : 0,
      highRiskPredictions: predictions.filter(p => p.riskScore >= 0.7).length,
      mediumRiskPredictions: predictions.filter(p => p.riskScore >= 0.4 && p.riskScore < 0.7).length,
      lowRiskPredictions: predictions.filter(p => p.riskScore < 0.4).length
    };

    res.json({
      success: true,
      data: {
        weeklyData,
        totalValue,
        latestValue,
        trend,
        stats,
        dengueData: dengueData.slice(0, 100), // Limit to first 100 for response size
        predictions: predictions.slice(0, 100)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Generate cache key for coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} tolerance - Tolerance value
 * @returns {string} Cache key
 */
function generateNearbyCasesCacheKey(latitude, longitude, tolerance) {
  // Round coordinates to 4 decimal places for cache efficiency
  const lat = Math.round(latitude * 10000) / 10000;
  const lon = Math.round(longitude * 10000) / 10000;
  const tol = Math.round(tolerance * 100000) / 100000; // Round tolerance to 5 decimal places
  return `nearby-cases:${lat}:${lon}:${tol}`;
}

/**
 * Get cached nearby cases
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Cached data or null
 */
async function getCachedNearbyCases(cacheKey) {
  if (!redisClient || !redisConnected) {
    return null;
  }
  
  try {
    const cached = await redisClient.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * Cache nearby cases result
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Nearby cases data
 * @param {number} ttl - Time to live in seconds (default: 1 hour = 3600)
 */
async function cacheNearbyCases(cacheKey, data, ttl = 3600) {
  if (!redisClient || !redisConnected) {
    return;
  }
  
  try {
    await redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

// Calculate centroid of a polygon from rings (similar to Python implementation)
function calculateCentroid(rings) {
  if (!rings || rings.length === 0) {
    return null;
  }
  
  let allX = [];
  let allY = [];
  
  // Extract all x and y coordinates from all rings
  for (const ring of rings) {
    if (Array.isArray(ring)) {
      for (const point of ring) {
        if (Array.isArray(point) && point.length >= 2) {
          allX.push(point[0]);
          allY.push(point[1]);
        }
      }
    }
  }
  
  if (allX.length === 0 || allY.length === 0) {
    return null;
  }
  
  // Calculate mean of all x and y coordinates
  const centroidX = allX.reduce((sum, x) => sum + x, 0) / allX.length;
  const centroidY = allY.reduce((sum, y) => sum + y, 0) / allY.length;
  
  return { x: centroidX, y: centroidY };
}

// Get nearby dengue cases within a radius (tolerance) of given coordinates
// Uses external API similar to Python implementation with Redis caching
async function getNearbyCases(req, res) {
  try {
    const { latitude, longitude, tolerance } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }
    
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    // Default tolerance for 2km radius (0.018 degrees)
    // 0.045 = 5km, so 2km = 0.045 * (2/5) = 0.018
    const tol = tolerance ? parseFloat(tolerance) : 0.018;
    
    if (isNaN(lat) || isNaN(lon) || isNaN(tol)) {
      return res.status(400).json({ error: 'Invalid latitude, longitude, or tolerance values' });
    }
    
    // Generate cache key
    const cacheKey = generateNearbyCasesCacheKey(lat, lon, tol);
    
    // Check cache first
    let cachedResult = await getCachedNearbyCases(cacheKey);
    
    if (cachedResult) {
      // Add cached flag to response
      cachedResult.cached = true;
      return res.json(cachedResult);
    }
    
    // If not in cache, fetch from external API
    // External API URL for dengue data (similar to Python implementation)
    const apiUrl = "https://sppk.mysa.gov.my/proxy/proxy.php?https://mygis.mysa.gov.my/erica1/rest/services/iDengue/WM_idengue/MapServer/4/query?f=json&where=1%3D1&returnGeometry=true&spatialRel=esriSpatialRelIntersects&outFields=SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI%2CSPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES%2CSPWD.AVT_WABAK_IDENGUE_NODM.NEGERI";
    
    // Fetch data from external API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DengueEye-API/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`External API returned status ${response.status}`);
    }
    
    const responseJson = await response.json();
    const features = responseJson.features || [];
    
    // Process features similar to Python implementation
    const filteredData = [];
    let totalNearbyCases = 0;
    const uniqueLocations = new Set();
    
    // Note: In Python, x_target is longitude and y_target is latitude
    // So we use lon as x_target and lat as y_target
    const xTarget = lon;
    const yTarget = lat;
    
    for (const feature of features) {
      const rings = feature.geometry?.rings;
      if (!rings || rings.length === 0) {
        continue;
      }
      
      // Calculate centroid
      const centroid = calculateCentroid(rings);
      if (!centroid) {
        continue;
      }
      
      const centroidX = centroid.x;
      const centroidY = centroid.y;
      
      // Check if centroid is within tolerance range
      if (
        (xTarget - tol <= centroidX && centroidX <= xTarget + tol) &&
        (yTarget - tol <= centroidY && centroidY <= yTarget + tol)
      ) {
        // Extract relevant attributes
        const attributes = feature.attributes || {};
        const location = attributes['SPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI'] || 'Unknown';
        const state = attributes['SPWD.AVT_WABAK_IDENGUE_NODM.NEGERI'] || 'Unknown';
        const totalCases = parseInt(attributes['SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES'] || '0', 10);
        
        if (location && location !== 'null' && location !== 'Unknown') {
          uniqueLocations.add(location);
        }
        
        totalNearbyCases += totalCases;
        
        filteredData.push({
          location: location,
          state: state,
          totalCases: totalCases,
          centroidX: centroidX,
          centroidY: centroidY,
          latitude: centroidY, // centroidY is latitude
          longitude: centroidX, // centroidX is longitude
        });
      }
    }
    
    const result = {
      count: filteredData.length,
      totalCases: totalNearbyCases,
      uniqueLocations: uniqueLocations.size,
      locations: Array.from(uniqueLocations),
      data: filteredData,
      cached: false,
    };
    
    // Cache the result for 1 hour (3600 seconds)
    await cacheNearbyCases(cacheKey, result, 3600);
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching nearby cases:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch nearby dengue cases' });
  }
}

// Helper function to get week of year
function getWeekOfYear(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return { year: d.getFullYear(), week };
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
  getLocations,
  generateReport,
  getNearbyCases,
}; 