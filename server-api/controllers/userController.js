const prisma = require('../prisma/client');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalError
} = require('../utils/errorResponse');
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
    logger.warn('[UPDATE PROFILE] No required fields to update', { userId });
    return sendValidationError(res, ['At least one field must be provided for update']);
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
    logger.error('[UPDATE PROFILE ERROR]', { error: err.message, stack: err.stack, userId });
    return sendInternalError(res, 'Failed to update profile', err);
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
        companyId: true,
        organization: true,
        userId: true,
      },
    });
    if (!user) {
      return sendNotFoundError(res, 'User');
    }
    res.json({ user });
  } catch (err) {
    logger.error('[GET USER ERROR]', { error: err.message, stack: err.stack, userId });
    return sendInternalError(res, 'Failed to fetch user', err);
  }
};    

// PATCH /users/:id/password
exports.updatePassword = async (req, res) => {
  const userId = req.params.id;
  const { password } = req.body;

  console.log('[UPDATE PASSWORD] Request received:', { userId, requestBody: { password: !!password } });

  if (!password || password.length < 6) {
    return sendValidationError(res, ['Password is required and must be at least 6 characters']);
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
    logger.error('[UPDATE PASSWORD ERROR]', { error: err.message, stack: err.stack, userId });
    return sendInternalError(res, 'Failed to update password', err);
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
    const where = {
      companyId: req.companyId // Filter by user's company
    };
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
        companyId: true,
        createdAt: true,
        updatedAt: true
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[GET ALL USERS] Retrieved ${users.length} users for company ${req.companyId}`);
    
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
    logger.error('[GET ALL USERS ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to fetch users', err);
  }
};


// POST /users
exports.createUser = async (req, res) => {
  const { email, password, name, phone, address, role, status, username, organization } = req.body;

  // Validate required fields
  if (!email || !password || !name) {
    logger.warn('[CREATE USER ERROR] Missing required fields', { email });
    const missingFields = [];
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!name) missingFields.push('name');
    return sendValidationError(res, [`Missing required fields: ${missingFields.join(', ')}`]);
  }

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      logger.warn('[CREATE USER ERROR] Email already exists', { email });
      return sendConflictError(res, 'Email already registered');
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
        organization,
        companyId: req.companyId // Assign to current user's company
      }
    });

    console.log(`[CREATE USER SUCCESS] New user created: ${email} for company ${req.companyId}`);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);

  } catch (err) {
    logger.error('[CREATE USER ERROR]', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Failed to create user', err);
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
      logger.warn('[DELETE USER] User not found', { userId });
      return sendNotFoundError(res, 'User');
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log('[DELETE USER] Successfully deleted user:', userId);
    res.json({ message: 'User deleted successfully.' });

  } catch (err) {
    logger.error('[DELETE USER ERROR]', { error: err.message, stack: err.stack, userId });
    return sendInternalError(res, 'Failed to delete user', err);
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
    logger.warn('[BULK DELETE USERS] Invalid or empty ids array');
    return sendValidationError(res, ['Please provide a non-empty array of user IDs']);
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
    logger.error('[BULK DELETE USERS ERROR]', { error: err.message, stack: err.stack, ids });
    return sendInternalError(res, 'Failed to delete users', err);
  }
};

//PUT /users/:id/permissions
exports.updateUserPermission = async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  console.log('[UPDATE USER PERMISSION] Request received:', { userId, role });

  if (!role) {
    logger.warn('[UPDATE USER PERMISSION] Missing role in request body', { userId });
    return sendValidationError(res, ['Role is required']);
  }

  // Validate role value
  const validRoles = ['admin', 'user'];
  if (!validRoles.includes(role)) {
    logger.warn('[UPDATE USER PERMISSION] Invalid role value', { userId, role });
    return sendValidationError(res, [`Invalid role. Must be one of: ${validRoles.join(', ')}`]);
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
    logger.error('[UPDATE USER PERMISSION ERROR]', { error: err.message, stack: err.stack, userId });
    return sendInternalError(res, 'Failed to update user permission', err);
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
    const companyId = req.companyId;
    
    // Get total users count for the company
    const total = await prisma.user.count({
      where: { companyId }
    });

    // Get active users (status = 'Verified')
    const active = await prisma.user.count({
      where: { status: 'Verified', companyId }
    });

    // Get pending users (status = 'Pending') 
    const pending = await prisma.user.count({
      where: { status: 'Pending', companyId }
    });

    // Get admin users count
    const admin = await prisma.user.count({
      where: { role: 'admin', companyId }
    });

    console.log(`[GET USER SUMMARY] Successfully retrieved user summary for company ${companyId}`);
    res.json({
      total,
      active, 
      pending,
      admin
    });

  } catch (err) {
    logger.error('[GET USER SUMMARY ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to get user summary', err);
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
      return sendNotFoundError(res, 'User');
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status }
    });

    console.log('[UPDATE USER STATUS] Successfully updated user status:', id);
    res.json({ user: updatedUser });

  } catch (err) {
    logger.error('[UPDATE USER STATUS ERROR]', { error: err.message, stack: err.stack, userId: req.params.id });
    return sendInternalError(res, 'Failed to update user status', err);
  }
};
