const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');
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
// async function getCoverageArea(lat, lon) {
//   if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
//   const key = `${lat},${lon}`;
//   if (geocodeCache.has(key)) return geocodeCache.get(key);
//   try {
//     const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&email=adamarbain2107@gmail.com`;
//     const geoRes = await axios.get(url, {
//       headers: {
//         'User-Agent': 'Drone4Dengue Seeder/1.0 (adamarbain2107@gmail.com)',
//         'Referer': 'https://drone4dengue.local/seed'
//       },
//       timeout: 15000,
//     });
//     const address = geoRes.data && geoRes.data.address ? geoRes.data.address : {};
//     const result = address.locality || extractPlaceName(address) || '';
//     geocodeCache.set(key, result);
//     return result;
//   } catch {
//     const fallback = '';
//     geocodeCache.set(key, fallback);
//     return fallback;
//   }
// }

async function seedDengueDataFromCSV() {
  await prisma.dengueData.deleteMany();
  
  // Get the first company location ID for seeding data
  const firstLocation = await prisma.companyLocation.findFirst();
  if (!firstLocation) {
    console.log('No company location found, skipping dengue data seeding');
    return;
  }
  
  // Resolve CSV locations in shared daily-scrap-dengue-data folder
  const DATA_DIR = path.resolve(__dirname, '../../daily-scrap-dengue-data');
  const ACTIVE_DENGUE_CSV = path.join(DATA_DIR, 'active_dengue.csv');
  const DENGUE_HOTSPOT_CSV = path.join(DATA_DIR, 'dengue_hotspot.csv');

  // Seed from active_dengue.csv
  const activeRows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(ACTIVE_DENGUE_CSV)
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
            // companyLocationId: firstLocation.id,
          });
        } catch (e) {}
      })
      .on('end', resolve)
      .on('error', reject);
  });
  // Fill coverageArea using reverse geocode, with rate limit and cache
  // for (const row of activeRows) {
  //   if (row.latitude && row.longitude) {
  //     row.coverageArea = await getCoverageArea(row.latitude, row.longitude);
  //     await delay(1100); // respect Nominatim max 1 req/sec
  //   } else {
  //     row.coverageArea = '';
  //   }
  // }
  if (activeRows.length) await prisma.dengueData.createMany({ data: activeRows });

  // Seed from dengue_hotspot.csv
  const hotspotRows = [];
  const seenHotspot = new Set();
  await new Promise((resolve, reject) => {
    fs.createReadStream(DENGUE_HOTSPOT_CSV)
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
            // companyLocationId: firstLocation.id,
          });
        } catch (e) {}
      })
      .on('end', resolve)
      .on('error', reject);
  });
  // Fill coverageArea using reverse geocode, with rate limit and cache
  // for (const row of hotspotRows) {
  //   if (row.latitude && row.longitude) {
  //     row.coverageArea = await getCoverageArea(row.latitude, row.longitude);
  //     await delay(1100); // respect Nominatim max 1 req/sec
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
  await prisma.dengueData.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companyLocation.deleteMany();
  await prisma.company.deleteMany();

  // Create companies first
  const companies = [
    {
      id: 'comp-001',
      name: 'Drone4Dengue Main',
      code: 'COMP001',
      description: 'Main company for Drone4Dengue operations',
      isActive: true,
    },
    {
      id: 'comp-002',
      name: 'HealthTech Solutions',
      code: 'COMP002',
      description: 'Health technology solutions provider',
      isActive: true,
    },
    {
      id: 'comp-003',
      name: 'Urban Health Monitoring',
      code: 'COMP003',
      description: 'Urban health monitoring services',
      isActive: true,
    },
    {
      id: 'comp-999',
      name: 'Public Mobile User',
      code: 'COMP999',
      description: 'Public Mobile user for Drone4Dengue operations',
      isActive: true,
    },
  ];

  await prisma.company.createMany({ data: companies });
  console.log('Seeded companies!');

  // Create company locations
  const companyLocations = [
    // Drone4Dengue Main locations
    {
      id: 'loc-001',
      name: 'Kuala Lumpur Central',
      address: 'Kuala Lumpur City Center, Malaysia',
      latitude: 3.1390,
      longitude: 101.6869,
      isActive: true,
      companyId: 'comp-001',
    },
    {
      id: 'loc-002',
      name: 'Petaling Jaya Office',
      address: 'Petaling Jaya, Selangor, Malaysia',
      latitude: 3.1073,
      longitude: 101.6085,
      isActive: true,
      companyId: 'comp-001',
    },
    {
      id: 'loc-003',
      name: 'Shah Alam Branch',
      address: 'Shah Alam, Selangor, Malaysia',
      latitude: 3.0733,
      longitude: 101.5185,
      isActive: true,
      companyId: 'comp-001',
    },
    // HealthTech Solutions locations
    {
      id: 'loc-004',
      name: 'Cyberjaya Headquarters',
      address: 'Cyberjaya, Selangor, Malaysia',
      latitude: 2.9213,
      longitude: 101.6559,
      isActive: true,
      companyId: 'comp-002',
    },
    {
      id: 'loc-005',
      name: 'Putrajaya Office',
      address: 'Putrajaya, Malaysia',
      latitude: 2.9264,
      longitude: 101.6964,
      isActive: true,
      companyId: 'comp-002',
    },
    // Urban Health Monitoring locations
    {
      id: 'loc-006',
      name: 'Klang Valley Operations',
      address: 'Klang, Selangor, Malaysia',
      latitude: 3.0333,
      longitude: 101.4500,
      isActive: true,
      companyId: 'comp-003',
    },
  ];

  await prisma.companyLocation.createMany({ data: companyLocations });
  console.log('Seeded company locations!');

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
      companyId: 'comp-001',
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
      companyId: 'comp-001',
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
      companyId: 'comp-001',
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
      companyId: 'comp-001',
    },
    // Users for other companies
    {
      userId: 'U-005',
      email: 'admin@healthtech.com',
      password: 'adminpass3',
      name: 'HealthTech Admin',
      role: 'admin',
      status: 'Verified',
      username: 'healthtech_admin',
      phone: '60115555555',
      address: 'Cyberjaya',
      organization: 'HealthTech Solutions',
      companyId: 'comp-002',
    },
    {
      userId: 'U-006',
      email: 'user@healthtech.com',
      password: 'userpass3',
      name: 'HealthTech User',
      role: 'user',
      status: 'Verified',
      username: 'healthtech_user',
      phone: '60116666666',
      address: 'Putrajaya',
      organization: 'HealthTech Solutions',
      companyId: 'comp-002',
    },
    {
      userId: 'U-007',
      email: 'admin@urbanhealth.com',
      password: 'adminpass4',
      name: 'Urban Health Admin',
      role: 'admin',
      status: 'Verified',
      username: 'urban_admin',
      phone: '60117777777',
      address: 'Klang',
      organization: 'Urban Health Monitoring',
      companyId: 'comp-003',
    },
    {
      userId: 'U-008',
      email: 'admin@malaysiapublicuser.com',
      password: 'adminpass4',
      name: 'Malaysia Public User',
      role: 'admin',
      status: 'Verified',
      username: 'malaysia_public_user',
      phone: '60118888888',
      address: 'Kuala Lumpur',
      organization: 'Malaysia Public User',
      companyId: 'comp-999',
    },
  ];

  // Hash passwords
  for (const user of users) {
    user.password = await bcrypt.hash(user.password, 10);
  }

  // Insert users with hashed passwords
  await prisma.user.createMany({ data: users });

  console.log('Seeded users (with hashed passwords)!');

  // Insert recommendations for all risk levels
  await prisma.recommendation.deleteMany();
  const recommendations = [
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
  ];

  // Create recommendations (global, not company-specific)
  await prisma.recommendation.createMany({ data: recommendations });
  console.log('Seeded recommendations for all risk levels!');

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