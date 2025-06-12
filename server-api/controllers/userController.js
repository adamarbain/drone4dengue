const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// PATCH /users/:id
exports.updateProfile = async (req, res) => {
  const userId = req.params.id;
  const { name, username, phone } = req.body;
  
  console.log('[UPDATE PROFILE] Request received:', {
    userId,
    requestBody: { name, username, phone }
  });

  if (!name && !username && !email && !phone) {
    console.log('[UPDATE PROFILE] No fields to update');
    return res.status(400).json({ error: 'No fields to update.' });
  }

  try {
    console.log('[UPDATE PROFILE] Attempting database update');
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(username && { username }),
        ...(phone && { phone }),
      },
    });

    // Exclude password from response
    const { password, ...userWithoutPassword } = user;
    console.log('[UPDATE PROFILE] Update successful:', userWithoutPassword);
    res.json({ user: userWithoutPassword });
  } catch (err) {
    console.error('[UPDATE PROFILE ERROR]', err);
    console.log('[UPDATE PROFILE] Update failed for user:', userId);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

// GET /users/:id
exports.getUserById = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('[GET USER ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
};    