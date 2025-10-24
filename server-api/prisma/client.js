const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'create') {
    const lastUser = await prisma.user.findFirst({
      orderBy: { userId: 'desc' },
      select: { userId: true },
    });

    let nextId = 1;
    if (lastUser?.userId) {
      const match = lastUser.userId.match(/U-(\d+)/);
      if (match) {
        nextId = parseInt(match[1]) + 1;
      }
    }

    const newUserId = `U-${nextId.toString().padStart(3, '0')}`;
    params.args.data.userId = newUserId;
  }

  if (params.model === 'Drone' && params.action === 'create') {
    const lastDrone = await prisma.drone.findFirst({
      orderBy: { droneId: 'desc' },
      select: { droneId: true },
    });

    let nextId = 1;
    if (lastDrone?.droneId) {
      const match = lastDrone.droneId.match(/DRN-(\d+)/);
      if (match) {
        nextId = parseInt(match[1]) + 1;
      }
    }

    const newDroneId = `DRN-${nextId.toString().padStart(3, '0')}`;
    params.args.data.droneId = newDroneId;
  }

  return next(params);
});

module.exports = prisma;
