const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const parse = require('csv-parse');
const redis = require('redis');
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendInternalError
} = require('../utils/errorResponse');
const { getRiskLevelStats } = require('../utils/riskLevelUtils');

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
    logger.error('Redis Client Error', { error: err.message });
    redisConnected = false;
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
    redisConnected = true;
  });

  // Connect to Redis (non-blocking)
  redisClient.connect().catch((err) => {
    logger.error('Redis connection failed', { error: err.message });
    redisConnected = false;
  });
} catch (error) {
  logger.error('Failed to create Redis client', { error: error.message });
  redisConnected = false;
}

// Get all dengue data (with filters and pagination)
async function getAll(req, res) {
  try {
    const { 
      location, date, status, startDate, endDate, page = 1, limit = 20, search,
      country, state, district, city, suburb, postcode, road, houseNumber
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { };
    if (location) where.location = location;
    if (status) where.status = status;
    if (date) where.date = new Date(date);
    
    // New location-based filters
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (state) where.state = { contains: state, mode: 'insensitive' };
    if (district) where.district = { contains: district, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (suburb) where.suburb = { contains: suburb, mode: 'insensitive' };
    if (postcode) where.postcode = { contains: postcode, mode: 'insensitive' };
    if (road) where.road = { contains: road, mode: 'insensitive' };
    if (houseNumber) where.houseNumber = { contains: houseNumber, mode: 'insensitive' };
    
    if (search) {
      where.OR = [
        { location: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { suburb: { contains: search, mode: 'insensitive' } }
      ];
    }

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
    
    // Get total count for pagination
    const totalCount = await prisma.dengueData.count({ where });

    const data = await prisma.dengueData.findMany({ 
      where, 
      orderBy: { date: 'desc' },
      skip: skip,
      take: limitNum
    });

    res.json({
      data,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get one dengue data record
async function getOne(req, res) {
  try {
    const { id } = req.params;
    const record = await prisma.dengueData.findUnique({ where: { id } });
    if (!record) return sendNotFoundError(res, 'Dengue data record');
    res.json(record);
  } catch (err) {
    logger.error('[GET DENGUE DATA ERROR]', { error: err.message, stack: err.stack, recordId: req.params.id });
    return sendInternalError(res, 'Failed to fetch dengue data record', err);
  }
}

// Create a new dengue data record
async function create(req, res) {
  try {
    const { companyLocationId, ...otherData } = req.body;
    
    if (!companyLocationId) {
      return sendValidationError(res, ['companyLocationId is required']);
    }
    
    // Verify the companyLocationId belongs to the company
    const companyLocation = await prisma.companyLocation.findFirst({
      where: { 
        id: companyLocationId,
        companyId: req.companyId 
      }
    });
    
    if (!companyLocation) {
      return sendValidationError(res, ['Invalid company location ID or location does not belong to your company']);
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
    logger.error('[UPDATE DENGUE DATA ERROR]', { error: err.message, stack: err.stack, recordId: req.params.id });
    return sendInternalError(res, 'Failed to update dengue data record', err);
  }
}

// Delete a dengue data record
async function remove(req, res) {
  try {
    const { id } = req.params;
    await prisma.dengueData.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('[DELETE DENGUE DATA ERROR]', { error: err.message, stack: err.stack, recordId: req.params.id });
    return sendInternalError(res, 'Failed to delete dengue data record', err);
  }
}

// Upload CSV and import dengue data
async function uploadCSV(req, res) {
  if (!req.file) return sendValidationError(res, ['No file uploaded']);
  
  const { companyLocationId } = req.body;
  if (!companyLocationId) {
    return sendValidationError(res, ['companyLocationId is required']);
  }
  
  // Verify the companyLocationId belongs to the company
  const companyLocation = await prisma.companyLocation.findFirst({
    where: { 
      id: companyLocationId,
      companyId: req.companyId 
    }
  });
  
  if (!companyLocation) {
    return sendValidationError(res, ['Invalid company location ID or location does not belong to your company']);
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
          logger.error('Failed to send dengue case notification', { error: notifError.message });
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
    logger.error('[UPLOAD CSV ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to upload and import CSV', err);
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
    logger.error('[GET HISTORICAL ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to get historical trend data', err);
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
    logger.error('[GET MAP DATA ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to get map data', err);
  }
}

// Export data in multiple formats
async function exportData(req, res) {
  try {
    const { 
      location, date, status, startDate, endDate, format = 'csv', search,
      country, state, district, city, suburb, postcode, road, houseNumber
    } = req.query;
    
    const where = { };
    if (location) where.location = location;
    if (status) where.status = status;
    if (date) where.date = new Date(date);
    
    // New location-based filters
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (state) where.state = { contains: state, mode: 'insensitive' };
    if (district) where.district = { contains: district, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (suburb) where.suburb = { contains: suburb, mode: 'insensitive' };
    if (postcode) where.postcode = { contains: postcode, mode: 'insensitive' };
    if (road) where.road = { contains: road, mode: 'insensitive' };
    if (houseNumber) where.houseNumber = { contains: houseNumber, mode: 'insensitive' };
    
    if (search) {
      where.OR = [
        { location: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { suburb: { contains: search, mode: 'insensitive' } }
      ];
    }

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
    logger.error('[EXPORT DATA ERROR]', { error: err.message, stack: err.stack, format: req.query.format });
    return sendInternalError(res, 'Failed to export data', err);
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
    logger.error('[GET LOCATIONS ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to fetch locations', err);
  }
}

// Get filter options for all location fields (country, state, district, city, suburb, postcode, road, houseNumber)
async function getFilterOptions(req, res) {
  try {
    const allData = await prisma.dengueData.findMany({
      select: { 
        country: true,
        state: true,
        district: true,
        city: true,
        suburb: true,
        postcode: true,
        road: true,
        houseNumber: true
      }
    });
    
    // Helper function to get unique non-empty values
    const getUniqueValues = (field) => {
      const values = [...new Set(allData.map(item => item[field]).filter(val => val && val.trim() !== ''))];
      values.sort();
      return values;
    };
    
    const filterOptions = {
      countries: getUniqueValues('country'),
      states: getUniqueValues('state'),
      districts: getUniqueValues('district'),
      cities: getUniqueValues('city'),
      suburbs: getUniqueValues('suburb'),
      postcodes: getUniqueValues('postcode'),
      roads: getUniqueValues('road'),
      houseNumbers: getUniqueValues('houseNumber')
    };
    
    res.json(filterOptions);
  } catch (err) {
    logger.error('[GET FILTER OPTIONS ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to fetch filter options', err);
  }
}

// Get filtered options based on selected filters (cascading filter)
async function getFilteredOptions(req, res) {
  try {
    const { country, state, district, city, suburb, postcode } = req.query;
    
    const where = {};
    if (country) where.country = country;
    if (state) where.state = state;
    if (district) where.district = district;
    if (city) where.city = city;
    if (suburb) where.suburb = suburb;
    if (postcode) where.postcode = postcode;
    
    const allData = await prisma.dengueData.findMany({
      where,
      select: { 
        country: true,
        state: true,
        district: true,
        city: true,
        suburb: true,
        postcode: true,
        road: true,
        houseNumber: true
      }
    });
    
    // Helper function to get unique non-empty values
    const getUniqueValues = (field) => {
      const values = [...new Set(allData.map(item => item[field]).filter(val => val && val.trim() !== ''))];
      values.sort();
      return values;
    };
    
    const filterOptions = {
      countries: getUniqueValues('country'),
      states: getUniqueValues('state'),
      districts: getUniqueValues('district'),
      cities: getUniqueValues('city'),
      suburbs: getUniqueValues('suburb'),
      postcodes: getUniqueValues('postcode'),
      roads: getUniqueValues('road'),
      houseNumbers: getUniqueValues('houseNumber')
    };
    
    res.json(filterOptions);
  } catch (err) {
    logger.error('[GET FILTERED OPTIONS ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to fetch filtered options', err);
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
    let company = null;
    if (companyId) {
      // Fetch company to get prediction model parameters
      company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { predictionModelParameters: true }
      });

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

    // Calculate overall stats using company-specific thresholds
    const predictionModelParameters = company?.predictionModelParameters || {};
    const riskStats = getRiskLevelStats(predictions, predictionModelParameters);
    
    const stats = {
      totalDataPoints: dengueData.length,
      predictionsCount: predictions.length,
      averageRiskScore: predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + (p.riskScore || p.combinedScore || 0), 0) / predictions.length 
        : 0,
      highRiskPredictions: riskStats.highRiskPredictions,
      mediumRiskPredictions: riskStats.mediumRiskPredictions,
      lowRiskPredictions: riskStats.lowRiskPredictions
    };

    res.json({
      success: true,
      data: {
        weeklyData,
        totalValue,
        latestValue,
        trend,
        stats,
        dengueData,
        predictions
      }
    });
  } catch (err) {
    logger.error('[GENERATE REPORT ERROR]', { error: err.message, stack: err.stack, query: req.query });
    return sendInternalError(res, 'Failed to generate report', err);
  }
}

// Export report data in multiple formats (CSV, XLSX, PDF)
async function exportReport(req, res) {
  try {
    const { startDate, endDate, format = 'csv', status } = req.query;
    const companyId = req.companyId; // Get from auth middleware
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters: startDate, endDate' });
    }

    // Build date range filter
    const dateFilter = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z')
    };

    // Build where clause
    const where = {
      date: dateFilter
    };

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Fetch dengue data
    const dengueData = await prisma.dengueData.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    // Fetch company predictions if companyId is available
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

    const exportFormat = (format || 'csv').toString().toLowerCase();
    const safeDate = (value) => value ? new Date(value).toISOString().split('T')[0] : '';

    // Prepare export data
    const exportRows = [];
    
    // Add weekly summary data
    const weeklyMap = {};
    dengueData.forEach(record => {
      const week = getWeekOfYear(record.date);
      const weekKey = `${week.year}-W${week.week}`;
      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = { 
          week: weekKey, 
          value: 0, 
          date: record.date,
          activeCases: 0,
          totalCases: 0
        };
      }
      weeklyMap[weekKey].value += (status === 'Active Cases' ? (record.activeCases || 0) : (record.totalCases || 0));
      weeklyMap[weekKey].activeCases += (record.activeCases || 0);
      weeklyMap[weekKey].totalCases += (record.totalCases || 0);
    });
    
    const weeklyData = Object.values(weeklyMap).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Export as XLSX
    if (exportFormat === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      
      // Weekly Summary Sheet
      const weeklySheet = workbook.addWorksheet('Weekly Summary');
      weeklySheet.columns = [
        { header: 'Week', key: 'week', width: 15 },
        { header: 'Date', key: 'date', width: 18 },
        { header: 'Active Cases', key: 'activeCases', width: 16 },
        { header: 'Total Cases', key: 'totalCases', width: 16 },
        { header: 'Value', key: 'value', width: 16 }
      ];
      weeklyData.forEach(entry => {
        weeklySheet.addRow({
          week: entry.week,
          date: safeDate(entry.date),
          activeCases: entry.activeCases,
          totalCases: entry.totalCases,
          value: entry.value
        });
      });

      // Dengue Data Sheet
      const dataSheet = workbook.addWorksheet('Dengue Data');
      dataSheet.columns = [
        { header: 'Date', key: 'date', width: 18 },
        { header: 'Location', key: 'location', width: 24 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Active Cases', key: 'activeCases', width: 16 },
        { header: 'Total Cases', key: 'totalCases', width: 16 },
        { header: 'Coverage Area', key: 'coverageArea', width: 22 },
        { header: 'Source', key: 'source', width: 14 }
      ];
      dengueData.forEach(record => {
        dataSheet.addRow({
          date: safeDate(record.date),
          location: record.location || '',
          status: record.status || '',
          activeCases: record.activeCases ?? '',
          totalCases: record.totalCases ?? '',
          coverageArea: record.coverageArea || '',
          source: record.source || ''
        });
      });

      // Predictions Sheet (if available)
      if (predictions.length > 0) {
        const predictionsSheet = workbook.addWorksheet('Predictions');
        predictionsSheet.columns = [
          { header: 'Date', key: 'date', width: 18 },
          { header: 'Location', key: 'location', width: 30 },
          { header: 'Risk Score', key: 'riskScore', width: 16 },
          { header: 'Combined Score', key: 'combinedScore', width: 18 },
          { header: 'Address', key: 'address', width: 40 }
        ];
        predictions.forEach(pred => {
          predictionsSheet.addRow({
            date: safeDate(pred.createdAt),
            location: pred.companyLocation?.name || '',
            riskScore: pred.riskScore ?? '',
            combinedScore: pred.combinedScore ?? '',
            address: pred.companyLocation?.address || ''
          });
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="dengue_report_${startDate}_${endDate}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    // Export as PDF
    if (exportFormat === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dengue_report_${startDate}_${endDate}.pdf"`);
      doc.pipe(res);

      doc.fontSize(18).text('Dengue Report Export', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Date Range: ${startDate} - ${endDate}`);
      if (status) doc.text(`Status: ${status}`);
      doc.text(`Total Records: ${dengueData.length}`);
      doc.text(`Weekly Data Points: ${weeklyData.length}`);
      if (predictions.length > 0) doc.text(`Predictions: ${predictions.length}`);
      doc.moveDown();

      // Weekly Summary Section
      doc.fontSize(14).font('Helvetica-Bold').text('Weekly Summary', { underline: true });
      doc.moveDown(0.5);
      weeklyData.slice(0, 20).forEach(entry => {
        doc.font('Helvetica-Bold').text(`${entry.week} (${safeDate(entry.date)})`);
        doc.font('Helvetica').text(
          `Active Cases: ${entry.activeCases} | Total Cases: ${entry.totalCases} | Value: ${entry.value}`
        );
        doc.moveDown(0.3);
      });
      if (weeklyData.length > 20) {
        doc.font('Helvetica-Oblique').text(`+ ${weeklyData.length - 20} more weeks not shown.`);
      }

      doc.moveDown();

      // Sample Data Section
      doc.fontSize(14).font('Helvetica-Bold').text('Sample Dengue Data', { underline: true });
      doc.moveDown(0.5);
      dengueData.slice(0, 30).forEach(record => {
        doc.font('Helvetica-Bold').text(`${safeDate(record.date)} • ${record.location || 'N/A'}`);
        doc.font('Helvetica').text(
          `Status: ${record.status || '-'} | Active: ${record.activeCases ?? 0} | Total: ${record.totalCases ?? 0}`
        );
        doc.moveDown(0.3);
      });
      if (dengueData.length > 30) {
        doc.font('Helvetica-Oblique').text(`+ ${dengueData.length - 30} more records not shown.`);
      }

      doc.end();
      return;
    }

    // Default CSV export
    const fields = ['week', 'date', 'activeCases', 'totalCases', 'value'];
    const parser = new Parser({ fields });
    
    // Prepare CSV data
    const csvData = weeklyData.map(entry => ({
      week: entry.week,
      date: safeDate(entry.date),
      activeCases: entry.activeCases,
      totalCases: entry.totalCases,
      value: entry.value
    }));
    
    const csv = parser.parse(csvData);
    res.header('Content-Type', 'text/csv');
    res.attachment(`dengue_report_${startDate}_${endDate}.csv`);
    res.send(csv);
  } catch (err) {
    logger.error('[EXPORT REPORT ERROR]', { error: err.message, stack: err.stack, format: req.query.format });
    return sendInternalError(res, 'Failed to export report', err);
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
    logger.error('Redis get error', { error: error.message });
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
    logger.error('Redis set error', { error: error.message });
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
      return sendValidationError(res, ['Invalid latitude, longitude, or tolerance values']);
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
        
        // Each case includes latitude and longitude for mapping/display purposes
        filteredData.push({
          location: location,
          state: state,
          totalCases: totalCases,
          latitude: centroidY, // centroidY is latitude
          longitude: centroidX, // centroidX is longitude
          centroidX: centroidX, // Keep for reference
          centroidY: centroidY, // Keep for reference
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
    logger.error('[GET NEARBY CASES ERROR]', { error: err.message, stack: err.stack, latitude, longitude });
    return sendInternalError(res, 'Failed to fetch nearby dengue cases', err);
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
  getFilterOptions,
  getFilteredOptions,
  generateReport,
  exportReport,
  getNearbyCases,
}; 