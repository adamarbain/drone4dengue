const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

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

  // Insert dummy weather data
  // await prisma.weather.createMany({
  //   data: [
  //     {
  //       date: new Date('2024-01-15'),
  //       temperature: 28.5,
  //       humidity: 75,
  //       rainfall: 12.3,
  //       location: 'Kuala Lumpur',
  //     },
  //     {
  //       date: new Date('2024-01-14'),
  //       temperature: 30.2,
  //       humidity: 68,
  //       rainfall: 0,
  //       location: 'Kuala Lumpur',
  //     },
  //     {
  //       date: new Date('2024-01-13'),
  //       temperature: 29.8,
  //       humidity: 82,
  //       rainfall: 25.7,
  //       location: 'Kuala Lumpur',
  //     },
  //     {
  //       date: new Date('2024-01-12'),
  //       temperature: 27.1,
  //       humidity: 80,
  //       rainfall: 5.2,
  //       location: 'Petaling Jaya',
  //     },
  //     {
  //       date: new Date('2024-01-11'),
  //       temperature: 31.0,
  //       humidity: 70,
  //       rainfall: 0,
  //       location: 'Shah Alam',
  //     },
  //   ],
  // });

  console.log('Seeded users (with hashed passwords)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 