const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { parse } = require('csv-parse');
const axios = require('axios');
const prisma = new PrismaClient();

function extractPlaceName(address) {
  return (
    address.suburb ||
    address.city ||
    address.town ||
    address.village ||
    address.state ||
    address.county ||
    address.country ||
    null
  );
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const geocodeCache = new Map();
// async function getPlaceName(lat, lon) {
//   const key = `${lat},${lon}`;
//   if (geocodeCache.has(key)) return geocodeCache.get(key);
//   try {
//     const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
//     const geoRes = await axios.get(geoUrl);
//     const address = geoRes.data.address || {};
//     const place = extractPlaceName(address);
//     const result = place || `Lat:${lat},Lon:${lon}`;
//     geocodeCache.set(key, result);
//     return result;
//   } catch {
//     const fallback = `Lat:${lat},Lon:${lon}`;
//     geocodeCache.set(key, fallback);
//     return fallback;
//   }
// }

async function seedDengueDataFromCSV() {
  await prisma.dengueData.deleteMany();
  // Seed from active_dengue.csv
  const activeRows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(__dirname + '/active_dengue.csv')
      .pipe(parse({ columns: true, trim: true }))
      .on('data', row => {
        try {
          const [day, month, year] = row.date.split('/');
          activeRows.push({
            date: new Date(`${year}-${month}-${day}`),
            location: row.location,
            activeCases: parseInt(row.total_active_cases) || 0,
            totalCases: null,
            coverageArea: '', // to be filled later
            status: 'Active Cases',
            source: 'active_dengue',
            latitude: parseFloat(row.centroid_y),
            longitude: parseFloat(row.centroid_x),
            days_duration: null,
          });
        } catch (e) {}
      })
      .on('end', resolve)
      .on('error', reject);
  });
  // Fill coverageArea using reverse geocode, with rate limit and cache
  // for (const row of activeRows) {
  //   if (row.latitude && row.longitude) {
  //     row.coverageArea = await getPlaceName(row.latitude, row.longitude);
  //     await delay(1100); // 1.1s to respect Nominatim rate limit
  //   } else {
  //     row.coverageArea = '';
  //   }
  // }
  if (activeRows.length) await prisma.dengueData.createMany({ data: activeRows });

  // Seed from dengue_hotspot.csv
  const hotspotRows = [];
  const seenHotspot = new Set();
  await new Promise((resolve, reject) => {
    fs.createReadStream(__dirname + '/dengue_hotspot.csv')
      .pipe(parse({ columns: true, trim: true }))
      .on('data', row => {
        try {
          const [day, month, year] = row.date.split('/');
          const dateStr = `${year}-${month}-${day}`;
          const key = `${dateStr}_${row.total_active_cases}`;
          if (seenHotspot.has(key)) return; // skip duplicate
          seenHotspot.add(key);
          hotspotRows.push({
            date: new Date(dateStr),
            location: row.area,
            activeCases: parseInt(row.total_active_cases) || 0,
            totalCases: parseInt(row.total_active_cases) || 0,
            coverageArea: '', // to be filled later
            status: 'Hotspot',
            source: 'dengue_hotspot',
            latitude: parseFloat(row.y),
            longitude: parseFloat(row.x),
            days_duration: row.days_duration ? parseInt(row.days_duration) : null,
          });
        } catch (e) {}
      })
      .on('end', resolve)
      .on('error', reject);
  });
  // Fill coverageArea using reverse geocode, with rate limit and cache
  // for (const row of hotspotRows) {
  //   if (row.latitude && row.longitude) {
  //     row.coverageArea = await getPlaceName(row.latitude, row.longitude);
  //     await delay(1100); // 1.1s to respect Nominatim rate limit
  //   } else {
  //     row.coverageArea = '';
  //   }
  // }
  if (hotspotRows.length) await prisma.dengueData.createMany({ data: hotspotRows });
  console.log('Seeded DengueData from CSVs!');
}

async function main() {
  // Clear existing data
  await prisma.weather.deleteMany();
  await prisma.user.deleteMany();

  // User data with plain passwords
  const users = [
    {
      userId: 'U-001',
      email: 'admin1@drone4dengue.com',
      password: 'adminpass1',
      name: 'Admin One',
      role: 'admin',
      status: 'Verified',
      username: 'adminone',
      phone: '60111111111',
      address: 'Kuala Lumpur',
      organization: 'Drone4Dengue',
    },
    {
      userId: 'U-002',
      email: 'admin2@drone4dengue.com',
      password: 'adminpass2',
      name: 'Admin Two',
      role: 'admin',
      status: 'Verified',
      username: 'admintwo',
      phone: '60112222222',
      address: 'Petaling Jaya',
      organization: 'Drone4Dengue',
    },
    {
      userId: 'U-003',
      email: 'user1@drone4dengue.com',
      password: 'userpass1',
      name: 'User One',
      role: 'user',
      status: 'Verified',
      username: 'userone',
      phone: '60113333333',
      address: 'Shah Alam',
      organization: 'Drone4Dengue',
    },
    {
      userId: 'U-004',
      email: 'user2@drone4dengue.com',
      password: 'userpass2',
      name: 'User Two',
      role: 'user',
      status: 'Pending',
      username: 'usertwo',
      phone: '60114444444',
      address: 'Subang Jaya',
      organization: 'Drone4Dengue',
    },
  ];

  // Hash passwords
  for (const user of users) {
    user.password = await bcrypt.hash(user.password, 10);
  }

  // Insert users with hashed passwords
  await prisma.user.createMany({ data: users });

  console.log('Seeded users (with hashed passwords)!');

  // Insert recommendations
  await prisma.recommendation.deleteMany();
  await prisma.recommendation.createMany({
    data: [
      // High risk
      { risk: 'high', title: 'Conduct Immediate Fogging', details: 'Contact your local authority urgently to conduct immediate fogging in your area.' },
      { risk: 'high', title: 'Clear stagnant water', details: 'Immediately around your home - Remove all stagnant water sources to prevent mosquito breeding.' },
      { risk: 'high', title: 'Apply Mosquito repellents', details: '(e.g., DEET-based, citronella oil) - Use EPA-approved insect repellent on exposed skin and clothing.' },
      { risk: 'high', title: 'Wear long sleeves and trousers', details: 'especially during morning and late evening - Wear protective clothing to reduce skin exposure.' },
      { risk: 'high', title: 'Use Mosquito Nets', details: 'Sleep under mosquito nets, especially during the day when Aedes mosquitoes are active.' },
      // Medium risk
      { risk: 'medium', title: 'Trim vegetation', details: 'Around your residence - Keep vegetation trimmed to reduce mosquito resting areas.' },
      { risk: 'medium', title: 'Inspections for stagnant water', details: 'Schedule inspections for stagnant water sources around your property.' },
      { risk: 'medium', title: 'Participate a community cleanup', details: 'Participate in or organize a community cleanup to eliminate breeding sites.' },
      { risk: 'medium', title: 'Ensure proper waste management', details: 'Ensure proper waste management at home and in your community.' },
      // Low risk
      { risk: 'low', title: 'Maintain cleanliness', details: 'Maintain cleanliness of home surroundings - Keep your area clean and free from trash.' },
      { risk: 'low', title: 'Encourage family', details: 'Encourage family and community to stay vigilant about dengue prevention.' },
      { risk: 'low', title: 'Stay Hydrated', details: 'Stay Hydrated by drinking 8L water per day - Maintain good health and hydration.' },
      { risk: 'low', title: 'Check and clean flower pots', details: 'Check and clean flower pots, roof gutters regularly to prevent water accumulation.' },
    ]
  });

  // Seed DengueData from CSVs
  await seedDengueDataFromCSV();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 