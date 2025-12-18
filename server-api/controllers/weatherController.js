const prisma = require('../prisma/client');
const axios = require('axios');
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendInternalError
} = require('../utils/errorResponse');

// GET /weather/data
// List all weather records
// Support filters: date range, location
exports.listWeatherData = async (req, res) => {
    try {
        logger.debug('[WEATHER] Fetching weather data', { query: req.query, companyId: req.companyId });
        
        // Get company locations for the company
        const companyLocations = await prisma.companyLocation.findMany({
            where: { companyId: req.companyId },
            select: { id: true }
        });
        const locationIds = companyLocations.map(loc => loc.id);
        
        const weather = await prisma.weather.findMany({
            where: { 
                companyLocationId: { in: locationIds }
            },
            include: {
                companyLocation: {
                    select: { name: true, address: true }
                }
            },
            orderBy: { date: 'desc' },
        });
        res.status(200).json(weather);
    } catch (err) {
        logger.error('[WEATHER ERROR] Failed to fetch weather data', { error: err.message, stack: err.stack, companyId: req.companyId });
        return sendInternalError(res, 'Failed to fetch weather data', err);
    }
};

// GET /weather/summary
// return
// {
//     "totalRecords": 3,
//     "avgTemperature": 29.5,
//     "avgHumidity": 75.0,
//     "totalRainfall": 38.0
// }
exports.getWeatherSummary = async (req, res) => {
    try {
        logger.debug('[WEATHER] Fetching weather summary for company', { companyId: req.companyId });
        
        // Get company locations for the company
        const companyLocations = await prisma.companyLocation.findMany({
            where: { companyId: req.companyId },
            select: { id: true }
        });
        const locationIds = companyLocations.map(loc => loc.id);
        const where = { companyLocationId: { in: locationIds } };
        
        const [count, avgTemp, avgHumidity, totalRain] = await Promise.all([
            prisma.weather.count({ where }),
            prisma.weather.aggregate({ where, _avg: { temperature: true } }),
            prisma.weather.aggregate({ where, _avg: { humidity: true } }),
            prisma.weather.aggregate({ where, _sum: { rainfall: true } }),
        ]);
        res.status(200).json({
            totalRecords: count,
            avgTemperature: avgTemp._avg.temperature || 0,
            avgHumidity: avgHumidity._avg.humidity || 0,
            totalRainfall: totalRain._sum.rainfall || 0,
        });
    } catch (err) {
        logger.error('[WEATHER ERROR] Failed to fetch weather summary', { error: err.message, stack: err.stack, companyId: req.companyId });
        return sendInternalError(res, 'Failed to fetch weather summary', err);
    }
};

// POST /weather/
// Add new manual weather record
exports.addManualWeatherRecord = async (req, res) => {
    const { date, temperature, humidity, rainfall, location, companyLocationId } = req.body;
    if (!date || temperature == null || humidity == null || rainfall == null || !location || !companyLocationId) {
        logger.warn('[WEATHER ERROR] Missing required fields for manual weather record', { body: req.body });
        return sendValidationError(res, ['All fields (date, temperature, humidity, rainfall, location, companyLocationId) are required']);
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
    
    try {
        const weather = await prisma.weather.create({
            data: { 
                date: new Date(date), 
                temperature, 
                humidity, 
                rainfall, 
                location,
                companyLocationId
            },
        });
        console.log('[WEATHER] Added manual weather record for company', req.companyId, ':', weather);
        res.status(200).json(weather);
    } catch (err) {
        logger.error('[WEATHER ERROR] Failed to add manual weather record', { error: err.message, stack: err.stack, companyId: req.companyId });
        return sendInternalError(res, 'Failed to add manual weather record', err);
    }
};

// PUT  /weather/:id
// Update an existing weather record
exports.updateWeatherRecord = async (req, res) => {
    const { id } = req.params;
    const { date, temperature, humidity, rainfall, location, companyLocationId } = req.body;
    if (!id || !date || temperature == null || humidity == null || rainfall == null || !location || !companyLocationId) {
        logger.warn('[WEATHER ERROR] Missing required fields for update', { id, body: req.body });
        return sendValidationError(res, ['All fields (id, date, temperature, humidity, rainfall, location, companyLocationId) are required']);
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
    
    try {
        const weather = await prisma.weather.update({
            where: { id },
            data: { date: new Date(date), temperature, humidity, rainfall, location, companyLocationId },
        });
        logger.debug('[WEATHER] Updated weather record', { weatherId: weather.id });
        res.status(200).json(weather);
    } catch (err) {
        logger.error('[WEATHER ERROR] Failed to update weather record', { error: err.message, stack: err.stack, weatherId: id });
        return sendInternalError(res, 'Failed to update weather record', err);
    }
};

// DELETE /weather/:id
// Delete a weather record
exports.deleteWeatherRecord = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        logger.warn('[WEATHER ERROR] Missing id for delete');
        return sendValidationError(res, ['ID is required']);
    }
    try {
        await prisma.weather.delete({
            where: { id },
        });
        logger.debug('[WEATHER] Deleted weather record', { weatherId: id });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        logger.error('[WEATHER ERROR] Failed to delete weather record', { error: err.message, stack: err.stack, weatherId: id });
        return sendInternalError(res, 'Failed to delete weather record', err);
    }
};

//  POST /weather/upload-csv
// Accept and parse CSV (use multer + csv-parser)
// Convert rows to Weather entries and save via prisma.weather.createMany
exports.uploadWeatherCSV = async (req, res) => {
    console.log(req.file)
    if (!req.file || !req.file.buffer) {
        logger.warn('[WEATHER ERROR] No CSV file uploaded');
        return sendValidationError(res, ['CSV file is required']);
    }
    
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
    
    try {
        const csvData = req.file.buffer.toString('utf-8');
        const rows = csvData.split('\n').slice(1).filter(Boolean);
        const weatherData = rows.map(row => {
            const [date, temperature, humidity, rainfall, location] = row.split(',');
            return { 
                date: new Date(date), 
                temperature: Number(temperature), 
                humidity: Number(humidity), 
                rainfall: Number(rainfall), 
                location,
                companyLocationId
            };
        });
        await prisma.weather.createMany({ data: weatherData, skipDuplicates: true });
        logger.info('[WEATHER] Uploaded CSV', { records: weatherData.length, companyId: req.companyId });
        res.status(200).json({ message: `Uploaded ${weatherData.length} records.` });
    } catch (err) {
        logger.error('[WEATHER ERROR] Failed to upload CSV', { error: err.message, stack: err.stack, companyId: req.companyId });
        return sendInternalError(res, 'Failed to upload CSV', err);
    }
};

// GET /weather/export
// Return downloadable CSV of all weather data
exports.exportWeatherData = async (req, res) => {
    try {
        // Get company locations for the company
        const companyLocations = await prisma.companyLocation.findMany({
            where: { companyId: req.companyId },
            select: { id: true }
        });
        const locationIds = companyLocations.map(loc => loc.id);
        
        const weather = await prisma.weather.findMany({
            where: { companyLocationId: { in: locationIds } }
        });
        const csv = convertToCSV(weather);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="weather-data.csv"');
        logger.info('[WEATHER] Exported weather records as CSV', { records: weather.length, companyId: req.companyId });
        res.status(200).send(csv);
    } catch (err) {
        logger.error('[WEATHER ERROR] Failed to export weather data', { error: err.message, stack: err.stack, companyId: req.companyId });
        return sendInternalError(res, 'Failed to export weather data', err);
    }
};

// Helper function to convert weather data to CSV
function convertToCSV(data) {
    const headers = ['Date', 'Temperature', 'Humidity', 'Rainfall', 'Location'];
    const rows = data.map(item => [
        item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date,
        item.temperature,
        item.humidity,
        item.rainfall,
        item.location,
    ]);
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// POST /weather/fetch-and-store
// Fetch daily weather data for the past month from Open-Meteo and store in DB
exports.fetchAndStoreWeather = async (req, res) => {
    const { latitude, longitude, companyLocationId } = req.body;
    if (!latitude || !longitude || !companyLocationId) {
        return sendValidationError(res, ['Latitude, longitude, and companyLocationId are required']);
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

    // Calculate date range for the past week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    endDate.setDate(endDate.getDate() - 1);

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    try {
        // Fetch from Open-Meteo (hourly)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&hourly=relative_humidity_2m&timezone=Asia%2FSingapore&past_days=7&forecast_days=1`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'drone4dengue-weather/1.0 (contact: adamarbain2107@gmail.com)',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const daily = response.data.daily;
        const hourly = response.data.hourly;

        // Reverse geocode to get place name
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        const geoRes = await axios.get(geoUrl, {
            headers: {
                'User-Agent': 'drone4dengue-weather/1.0 (contact: adamarbain2107@gmail.com)',
                'Accept': 'application/json',
                'Referer': 'https://drone4dengue.com/weather'
            },
            timeout: 8000
        });
        const placeName = geoRes.data.name + " " + geoRes.data.address.city || `Lat:${latitude},Lon:${longitude}`;

        // Helper: group hourly humidity by day
        const humidityByDay = {};
        if (hourly && hourly.time && hourly.relative_humidity_2m) {
            hourly.time.forEach((datetime, i) => {
                const day = datetime.split('T')[0];
                if (!humidityByDay[day]) humidityByDay[day] = [];
                humidityByDay[day].push(hourly.relative_humidity_2m[i]);
            });
        }

        const weatherData = daily.time.map((date, i) => {
            // Average humidity for this day
            const humidities = humidityByDay[date] || [];
            const avgHumidity =
                humidities.length > 0
                    ? Number((humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(2))
                    : 0;

            // Average temperature for this day
            const avgTemp = Number(
                (((daily.temperature_2m_max[i] ?? 0) + (daily.temperature_2m_min[i] ?? 0)) / 2).toFixed(2)
            );

            return {
                date: new Date(date),
                temperature: avgTemp,
                humidity: avgHumidity,
                rainfall: Number((daily.precipitation_sum[i] ?? 0).toFixed(2)),
                location: placeName,
                companyLocationId,
            };
        });

        // Insert into DB (skip duplicates)
        await prisma.weather.createMany({
            data: weatherData,
            skipDuplicates: true,
        });

        // Return all weather data for this location and period
        const allWeather = await prisma.weather.findMany({
            where: {
                date: {
                    gte: new Date(start),
                    lte: new Date(end),
                },
                location: placeName,
                companyLocationId,
            },
            orderBy: { date: 'desc' },
        });

        res.status(200).json(allWeather);
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to fetch/store Open-Meteo data:', err);
        res.status(500).json({ error: 'Failed to fetch/store Open-Meteo data.' });
    }
};
