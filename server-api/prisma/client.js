const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'create') {
    const lastUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
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

  return next(params);
});

module.exports = prisma;
