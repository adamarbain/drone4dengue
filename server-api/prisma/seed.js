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
    {
      risk: 'high',
      title: 'Conduct Immediate Fogging/Space Spraying',
      details: 'Contact your local health authority immediately. In high-risk clusters, thermal fogging or ultra-low volume (ULV) spraying is necessary to kill infected adult mosquitoes and break the transmission chain rapidly.',
      referenceLink: 'https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue'
    },
    {
      risk: 'high',
      title: 'Apply EPA-Registered Repellents',
      details: 'Apply insect repellent containing DEET, Picaridin, or IR3535 on exposed skin. These ingredients are proven to provide long-lasting protection against biting Aedes mosquitoes.',
      referenceLink: 'https://www.cdc.gov/mosquitoes/mosquito-bites/prevent-mosquito-bites.html'
    },
    {
      risk: 'high',
      title: 'Wear Permethrin-Treated or Long Clothing',
      details: 'Wear long-sleeved shirts and long pants. For added protection, treat clothing with 0.5% permethrin, which repels and kills mosquitoes on contact. Do not apply permethrin directly to skin.',
      referenceLink: 'https://www.cdc.gov/mosquitoes/mosquito-bites/prevent-mosquito-bites.html'
    },
    {
      risk: 'high',
      title: 'Eliminate Indoor Stagnant Water Immediately',
      details: 'Aedes mosquitoes often breed indoors. Immediately empty and scrub vases, flower pot saucers, and tray water dispensers. Aedes eggs can stick to the walls of containers, so scrubbing is vital.',
      referenceLink: 'https://www.nea.gov.sg/dengue-zika/prevention/mozzie-wipeout'
    },
    {
      risk: 'high',
      title: 'Monitor for Dengue Symptoms',
      details: 'Be vigilant for high fever accompanied by severe headache, pain behind the eyes, muscle/joint pain, or rash. If symptoms appear in a high-risk zone, seek medical attention immediately to manage potential complications.',
      referenceLink: 'https://www.cdc.gov/dengue/symptoms/index.html'
    },
    {
      risk: 'high',
      title: 'Isolate Infected Family Members',
      details: 'If a family member has fever or confirmed Dengue, they must sleep under a mosquito net or in a screened room. This prevents mosquitoes from biting the sick person and spreading the virus to others in the house.',
      referenceLink: 'https://www.cdc.gov/dengue/prevention/protect-yourself.html'
    },
    {
      risk: 'high',
      title: 'Use Household Aerosol Sprays',
      details: 'Use a household insecticide aerosol spray in dark, cool areas where mosquitoes rest (e.g., under beds, behind curtains, and in closets) to immediately kill adult mosquitoes hiding indoors.',
      referenceLink: 'https://www.nea.gov.sg/dengue-zika/prevention/household-insecticide'
    },
    {
      risk: 'high',
      title: 'Keep Windows and Doors Closed',
      details: 'Keep windows and doors closed, or keep air conditioning on, especially during the two peak biting periods: early morning (after sunrise) and late afternoon (before sunset).',
      referenceLink: 'https://www.epa.gov/mosquitocontrol/success-mosquito-control-integrated-pest-management'
    },
    {
      risk: 'high',
      title: 'Avoid Scented Soaps and Perfumes',
      details: 'Avoid using heavily scented soaps, shampoos, or perfumes. Floral and fruity scents can attract mosquitoes. Opt for unscented hygiene products during high-risk outbreaks.',
      referenceLink: 'https://extension.psu.edu/mosquitoes-biology-and-management'
    },
    {
      risk: 'medium',
      title: 'Scrub and Cover Water Storage',
      details: 'Merely emptying water is insufficient. You must scrub the inner walls of containers to dislodge mosquito eggs, which can survive dry conditions for months, and keep all water storage tightly covered.',
      referenceLink: 'https://www.cdc.gov/mosquitoes/mosquito-control/athome/index.html'
    },

    {
      risk: 'medium',
      title: 'Trim Dense Vegetation',
      details: 'Adult Aedes mosquitoes rest in cool, shaded, and vegetated areas during the day. Keep bushes trimmed and grass short to reduce resting sites near your home.',
      referenceLink: 'https://pubmed.ncbi.nlm.nih.gov/26084606/' // Study on vegetation and Aedes resting behavior
    },
    {
      risk: 'medium',
      title: 'Apply Larvicide (Abate) to Non-Potable Water',
      details: 'For water that cannot be emptied (e.g., decorative ponds, pumps, or large tanks), add sand granular larvicide (Temephos/Abate) every 3 months to prevent larvae from developing into adults.',
      referenceLink: 'https://www.who.int/publications/i/item/9789241502153'
    },
    {
      risk: 'medium',
      title: 'Organize Community "Search and Destroy"',
      details: 'Dengue is a community issue. Organize or join a neighborhood cleanup to remove trash, old tires, and debris that collect rain water. Vector control is most effective when an entire cluster participates.',
      referenceLink: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5622616/' // Review on community engagement for vector control
    },
    {
      risk: 'medium',
      title: 'Manage Solid Waste Disposal',
      details: 'Ensure all household trash, especially disposable containers like cups and bottles, is tied in plastic bags and disposed of in covered bins. Open trash is a primary breeding ground after rain.',
      referenceLink: 'https://www.cdc.gov/dengue/prevention/index.html'
    },
    {
      risk: 'medium',
      title: 'Seal Septic Tanks and Plumbing Vents',
      details: 'Repair cracks or gaps in septic tanks and cover plumbing vent pipes with wire mesh. These are massive, often hidden underground breeding sites for mosquitoes that can produce thousands of larvae.',
      referenceLink: 'https://www.cdc.gov/mosquitoes/mosquito-control/athome/septictanks.html'
    },
    {
      risk: 'medium',
      title: 'Drill Holes in Tire Swings/Planters',
      details: 'Old tires are the #1 breeding ground due to their shape and heat retention. If used for swings or planters, drill drainage holes in the bottom or fill them completely with soil so no water pockets remain.',
      referenceLink: 'https://www.epa.gov/mosquitocontrol/mosquito-control-and-waste-tires'
    },
    {
      risk: 'medium',
      title: 'Introduce Biological Controls (Fish)',
      details: 'For large water containers that cannot be emptied (like decorative lotus jars or ponds), introduce larvivorous fish such as Guppies or Wolbachia-carrying mosquitoes (if part of a local program) to eat larvae.',
      referenceLink: 'https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue'
    },
    {
      risk: 'medium',
      title: 'Flip and Store Buckets Under Shelter',
      details: 'Store all buckets, pails, and watering cans upside down and under a roof. Even a small amount of rainwater collected in an upright bucket rim can support breeding.',
      referenceLink: 'https://www.cdc.gov/zika/prevention/controlling-mosquitoes-at-home.html'
    },
    {
      risk: 'low',
      title: 'Weekly "Mozzie Wipeout" Routine',
      details: 'Dedicate 10 minutes once a week to inspect your home. Check roof gutters, turn over pails, and replace water in vases. Breaking the 7-day breeding cycle of the mosquito is the most effective prevention.',
      referenceLink: 'https://www.nea.gov.sg/dengue-zika/prevention/mozzie-wipeout'
    },
    {
      risk: 'low',
      title: 'Install Window and Door Screens',
      details: 'Retrofit your home with structural barriers. Installing wire mesh screens on windows and doors prevents mosquitoes from entering while allowing ventilation, serving as a permanent passive protection measure.',
      referenceLink: 'https://www.cdc.gov/mosquitoes/mosquito-control/athome/index.html'
    },
    {
      risk: 'low',
      title: 'Maintain Adequate Hydration',
      details: 'Good hydration supports general immunity. While it does not prevent bites, staying well-hydrated (approx. 2-3 Liters/day for adults) is critical if infection occurs to prevent shock. Note: Avoid excessive over-hydration (8L is unsafe).',
      referenceLink: 'https://www.cdc.gov/dengue/symptoms/index.html'
    },
    {
      risk: 'low',
      title: 'Educate Family on Vector Biology',
      details: 'Educate family members that Aedes mosquitoes are day-biters (active early morning and late afternoon). Awareness of peak biting times helps family members know when to take extra precautions.',
      referenceLink: 'https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue'
    },
    {
      risk: 'low',
      title: 'Switch to Soil-Based Gardening',
      details: 'Avoid growing plants in water (hydroponics) as they are common breeding sites. If you must use water, change it every 2 days and scrub the roots. Prefer soil-based potted plants.',
      referenceLink: 'https://www.nea.gov.sg/dengue-zika/prevention/breeding-habitats'
    },
    {
      risk: 'low',
      title: 'Unclog Roof Gutters and Drains',
      details: 'Leaves and debris can clog roof gutters, creating stagnant water pools high above the ground that are hard to see. Clean gutters once a month to ensure water flows freely.',
      referenceLink: 'https://www.cdc.gov/mosquitoes/mosquito-control/athome/index.html'
    },
    {
      risk: 'low',
      title: 'Avoid Bromeliads and Water-Holding Plants',
      details: 'Reconsider landscaping with plants like Bromeliads or Agave that naturally hold water in their leaf axils. If you keep them, flush the center with a hose weekly to wash out potential larvae.',
      referenceLink: 'https://edis.ifas.ufl.edu/publication/IN1332' // University of Florida Research on Bromeliads
    },
    {
      risk: 'low',
      title: 'Grant Access to Health Inspectors',
      details: 'Cooperate with local health officers during routine inspections. They can identify cryptic breeding sites (like behind fridge drip trays) that homeowners often miss.',
      referenceLink: 'https://www.nea.gov.sg/dengue-zika/prevention/overview'
    }
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