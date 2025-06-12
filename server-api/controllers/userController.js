const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// PATCH /users/:id
exports.updateProfile = async (req, res) => {
  const userId = req.params.id;
  const { name, username, phone, organization } = req.body;
  
  console.log('[UPDATE PROFILE] Request received:', {
    userId,
    requestBody: { name, username, phone, organization }
  });

  if (!name && !username && !email && !phone) {
    console.log('[UPDATE PROFILE] No required fields to update');
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
        ...(organization && { organization }) // Organization remains optional
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

// PATCH /users/:id/password
exports.updatePassword = async (req, res) => {
  const userId = req.params.id;
  const { password } = req.body;

  console.log('[UPDATE PASSWORD] Request received:', { userId, requestBody: { password: !!password } });

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password is required and must be at least 6 characters.' });
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Update the user in the database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    console.log('[UPDATE PASSWORD] Password updated for user:', userId);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[UPDATE PASSWORD ERROR]', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
};