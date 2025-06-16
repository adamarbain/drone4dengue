const prisma = require('../prisma/client');
const axios = require('axios');

// GET /weather/data
// List all weather records
// Support filters: date range, location
exports.listWeatherData = async (req, res) => {
    try {
        console.log('[WEATHER] Fetching weather data', { query: req.query });
        const weather = await prisma.weather.findMany({
            orderBy: { date: 'desc' },
        });
        res.status(200).json(weather);
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to fetch weather data:', err);
        res.status(500).json({ error: 'Failed to fetch weather data.' });
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
        console.log('[WEATHER] Fetching weather summary');
        const [count, avgTemp, avgHumidity, totalRain] = await Promise.all([
            prisma.weather.count(),
            prisma.weather.aggregate({ _avg: { temperature: true } }),
            prisma.weather.aggregate({ _avg: { humidity: true } }),
            prisma.weather.aggregate({ _sum: { rainfall: true } }),
        ]);
        res.status(200).json({
            totalRecords: count,
            avgTemperature: avgTemp._avg.temperature || 0,
            avgHumidity: avgHumidity._avg.humidity || 0,
            totalRainfall: totalRain._sum.rainfall || 0,
        });
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to fetch weather summary:', err);
        res.status(500).json({ error: 'Failed to fetch weather summary.' });
    }
};

// POST /weather/
// Add new manual weather record
exports.addManualWeatherRecord = async (req, res) => {
    const { date, temperature, humidity, rainfall, location } = req.body;
    if (!date || temperature == null || humidity == null || rainfall == null || !location) {
        console.log('[WEATHER ERROR] Missing required fields for manual weather record', req.body);
        return res.status(400).json({ error: 'All fields (date, temperature, humidity, rainfall, location) are required.' });
    }
    try {
        const weather = await prisma.weather.create({
            data: { date: new Date(date), temperature, humidity, rainfall, location },
        });
        console.log('[WEATHER] Added manual weather record:', weather);
        res.status(200).json(weather);
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to add manual weather record:', err);
        res.status(500).json({ error: 'Failed to add manual weather record.' });
    }
};

// PUT  /weather/:id
// Update an existing weather record
exports.updateWeatherRecord = async (req, res) => {
    const { id } = req.params;
    const { date, temperature, humidity, rainfall, location } = req.body;
    if (!id || !date || temperature == null || humidity == null || rainfall == null || !location) {
        console.log('[WEATHER ERROR] Missing required fields for update', { id, ...req.body });
        return res.status(400).json({ error: 'All fields (id, date, temperature, humidity, rainfall, location) are required.' });
    }
    try {
        const weather = await prisma.weather.update({
            where: { id },
            data: { date: new Date(date), temperature, humidity, rainfall, location },
        });
        console.log('[WEATHER] Updated weather record:', weather);
        res.status(200).json(weather);
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to update weather record:', err);
        res.status(500).json({ error: 'Failed to update weather record.' });
    }
};

// DELETE /weather/:id
// Delete a weather record
exports.deleteWeatherRecord = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        console.log('[WEATHER ERROR] Missing id for delete');
        return res.status(400).json({ error: 'ID is required.' });
    }
    try {
        await prisma.weather.delete({
            where: { id },
        });
        console.log('[WEATHER] Deleted weather record:', id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to delete weather record:', err);
        res.status(500).json({ error: 'Failed to delete weather record.' });
    }
};

//  POST /weather/upload-csv
// Accept and parse CSV (use multer + csv-parser)
// Convert rows to Weather entries and save via prisma.weather.createMany
exports.uploadWeatherCSV = async (req, res) => {
    console.log(req.file)
    if (!req.file || !req.file.buffer) {
        console.log('[WEATHER ERROR] No CSV file uploaded');
        return res.status(400).json({ error: 'CSV file is required.' });
    }
    try {
        const csvData = req.file.buffer.toString('utf-8');
        const rows = csvData.split('\n').slice(1).filter(Boolean);
        const weatherData = rows.map(row => {
            const [date, temperature, humidity, rainfall, location] = row.split(',');
            return { date: new Date(date), temperature: Number(temperature), humidity: Number(humidity), rainfall: Number(rainfall), location };
        });
        await prisma.weather.createMany({ data: weatherData, skipDuplicates: true });
        console.log(`[WEATHER] Uploaded CSV with ${weatherData.length} records`);
        res.status(200).json({ message: `Uploaded ${weatherData.length} records.` });
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to upload CSV:', err);
        res.status(500).json({ error: 'Failed to upload CSV.' });
    }
};

// GET /weather/export
// Return downloadable CSV of all weather data
exports.exportWeatherData = async (req, res) => {
    try {
        const weather = await prisma.weather.findMany();
        const csv = convertToCSV(weather);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="weather-data.csv"');
        console.log(`[WEATHER] Exported ${weather.length} weather records as CSV`);
        res.status(200).send(csv);
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to export weather data:', err);
        res.status(500).json({ error: 'Failed to export weather data.' });
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
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
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
        const response = await axios.get(url);

        const daily = response.data.daily;
        const hourly = response.data.hourly;

        // Reverse geocode to get place name
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        const geoRes = await axios.get(geoUrl);
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
            },
            orderBy: { date: 'desc' },
        });

        res.status(200).json(allWeather);
    } catch (err) {
        console.error('[WEATHER ERROR] Failed to fetch/store Open-Meteo data:', err);
        res.status(500).json({ error: 'Failed to fetch/store Open-Meteo data.' });
    }
};
