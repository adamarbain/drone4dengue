const prisma = require('../prisma/client');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// PATCH /users/:id
exports.updateProfile = async (req, res) => {
  const userId = req.params.id;
  const { name, username, phone, organization, address, role, status } = req.body;
  
  console.log('[UPDATE PROFILE] Request received:', {
    userId,
    requestBody: { name, username, phone, organization, address, role, status }
  });

  if (!name && !username && !email && !phone && !address && !role && !status) {
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
        ...(organization && { organization }),
        ...(address && { address }),
        ...(role && { role }),
        ...(status && { status })
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
        status: true,
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

// GET /users
// Query params: search, status, role (for filtering)
// Returns: User list with meta (pagination, counts)
exports.getAllUsers = async (req, res) => {
  const { search, status, role, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * Number(limit);

  try {
    // Build where clause based on filters
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) {
      where.status = status;
    }
    if (role) {
      where.role = role;
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Get filtered users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        status: true,
        organization: true,
        createdAt: true,
        updatedAt: true
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[GET ALL USERS] Retrieved ${users.length} users`);
    
    res.json({
      users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (err) {
    console.error('[GET ALL USERS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};


// POST /users
exports.createUser = async (req, res) => {
  const { email, password, name, phone, address, role, status, username, organization } = req.body;

  // Validate required fields
  if (!email || !password || !name) {
    console.log(`[CREATE USER ERROR] Missing required fields for ${email}`);
    return res.status(400).json({ error: 'Email, password and name are required.' });
  }

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`[CREATE USER ERROR] Email already exists: ${email}`);
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        phone,
        address,
        role: role || 'user',
        status: status || 'Pending',
        username,
        organization
      }
    });

    console.log(`[CREATE USER SUCCESS] New user created: ${email}`);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);

  } catch (err) {
    console.error('[CREATE USER ERROR]', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
};

// DELETE /users/:id
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  console.log('[DELETE USER] Request received:', { userId });

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('[DELETE USER] User not found:', userId);
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log('[DELETE USER] Successfully deleted user:', userId);
    res.json({ message: 'User deleted successfully.' });

  } catch (err) {
    console.error('[DELETE USER ERROR]', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};

// POST /users/bulk-delete
// body : {
//   "ids": ["uuid1", "uuid2"]
// }
exports.bulkDeleteUsers = async (req, res) => {
  const { ids } = req.body;

  console.log('[BULK DELETE USERS] Request received:', { ids });

  if (!Array.isArray(ids) || ids.length === 0) {
    console.log('[BULK DELETE USERS] Invalid or empty ids array');
    return res.status(400).json({ error: 'Please provide an array of user IDs.' });
  }

  try {
    // Delete multiple users
    const result = await prisma.user.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    console.log('[BULK DELETE USERS] Successfully deleted users:', { count: result.count });
    res.json({ 
      message: 'Users deleted successfully',
      count: result.count 
    });

  } catch (err) {
    console.error('[BULK DELETE USERS ERROR]', err);
    res.status(500).json({ error: 'Failed to delete users.' });
  }
};

//PUT /users/:id/permissions
exports.updateUserPermission = async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  console.log('[UPDATE USER PERMISSION] Request received:', { userId, role });

  if (!role) {
    console.log('[UPDATE USER PERMISSION] Missing role in request body');
    return res.status(400).json({ error: 'Role is required.' });
  }

  // Validate role value
  const validRoles = ['admin', 'user'];
  if (!validRoles.includes(role)) {
    console.log('[UPDATE USER PERMISSION] Invalid role value:', role);
    return res.status(400).json({ error: 'Invalid role. Must be either "admin" or "user".' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        username: true
      }
    });

    console.log('[UPDATE USER PERMISSION] Successfully updated permission for user:', userId);
    res.json({ user });

  } catch (err) {
    console.error('[UPDATE USER PERMISSION ERROR]', err);
    res.status(500).json({ error: 'Failed to update user permission.' });
  }
};

// GET /users/summary/dashboard
// return : {
//   "total": 10,
//   "active": 4,
//   "pending": 2,
//   "admin": 4
// }
exports.getUserSummary = async (req, res) => {
  try {
    // Get total users count
    const total = await prisma.user.count();

    // Get active users (status = 'Verified')
    const active = await prisma.user.count({
      where: { status: 'Verified' }
    });

    // Get pending users (status = 'Pending') 
    const pending = await prisma.user.count({
      where: { status: 'Pending' }
    });

    // Get admin users count
    const admin = await prisma.user.count({
      where: { role: 'admin' }
    });

    console.log('[GET USER SUMMARY] Successfully retrieved user summary');
    res.json({
      total,
      active, 
      pending,
      admin
    });

  } catch (err) {
    console.error('[GET USER SUMMARY ERROR]', err);
    res.status(500).json({ error: 'Failed to get user summary.' });
  }
};

// PUT /users/:id/status
exports.adminUpdateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status }
    });

    console.log('[UPDATE USER STATUS] Successfully updated user status:', id);
    res.json({ user: updatedUser });

  } catch (err) {
    console.error('[UPDATE USER STATUS ERROR]', err);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
};
