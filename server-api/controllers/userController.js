const prisma = require('../prisma/client');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalError
} = require('../utils/errorResponse');
const { createNotification } = require('../services/notificationService');
const SALT_ROUNDS = 10;

// Email configuration
const email_sender_email = process.env.SENDER_EMAIL;
const email_sender_password = process.env.SENDER_EMAIL_PW;

// SMTP configurations for email sending
const getEmailConfigs = () => [
  {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: email_sender_email,
      pass: email_sender_password,
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    requireTLS: true,
  },
  {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: email_sender_email,
      pass: email_sender_password,
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
  },
];

// Helper function to send email with retry logic
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  let lastError;
  const configs = getEmailConfigs();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (let configIndex = 0; configIndex < configs.length; configIndex++) {
      let transporter = null;
      try {
        transporter = nodemailer.createTransport(configs[configIndex]);
        console.log(`[EMAIL] Attempt ${attempt}/${maxRetries} using config ${configIndex + 1} (port ${configs[configIndex].port})`);
        
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Send timeout')), 20000)
        );
        
        const info = await Promise.race([sendPromise, timeoutPromise]);
        console.log(`[EMAIL] Email sent successfully:`, info.messageId || 'messageId not available');
        
        if (transporter && transporter.close) {
          transporter.close();
        }
        return info;
      } catch (err) {
        lastError = err;
        console.error(`[EMAIL] Config ${configIndex + 1} failed:`, {
          message: err.message,
          code: err.code
        });
        
        if (transporter && transporter.close) {
          try { transporter.close(); } catch (closeErr) { }
        }
        
        if (err.code === 'EAUTH' || err.code === 'EENVELOPE') {
          throw err;
        }
      }
    }
    
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[EMAIL] All configs failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Failed to send email after all retries');
};

// Generate a random password
const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// PATCH /users/:id
exports.updateProfile = async (req, res) => {
  const userId = req.params.id;
  const { name, username, phone, organization, address, role, status, email } = req.body;
  
  console.log('[UPDATE PROFILE] Request received:', {
    userId,
    requestBody: { name, username, phone, organization, address, role, status, email }
  });

  // Check if at least one field is explicitly provided (not undefined)
  // Allow empty strings for phone and address
  const hasFieldsToUpdate = name !== undefined || 
                            username !== undefined || 
                            email !== undefined || 
                            phone !== undefined || 
                            address !== undefined || 
                            organization !== undefined ||
                            role !== undefined || 
                            status !== undefined;
  
  if (!hasFieldsToUpdate) {
    logger.warn('[UPDATE PROFILE] No required fields to update', { userId });
    return sendValidationError(res, ['At least one field must be provided for update']);
  }

  try {
    console.log('[UPDATE PROFILE] Attempting database update');
    const updateData = {};
    
    // Allow empty strings for phone and address (users should be able to clear these fields)
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (phone !== undefined) updateData.phone = phone; // Allow empty string
    if (organization !== undefined) updateData.organization = organization;
    if (address !== undefined) updateData.address = address; // Allow empty string
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        address: true,
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
        address: true,
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

// GET /users/dashboard/historical-stats
// Returns historical stats for last week comparison
// return : {
//   "riskPredictionsLastWeek": 5,
//   "droneInsightsLastWeek": 10,
//   "activeUsersLastWeek": 8
// }
exports.getDashboardHistoricalStats = async (req, res) => {
  try {
    const companyId = req.companyId;
    
    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Last week same day (7 days ago)
    const lastWeekSameDay = new Date(today);
    lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);
    const lastWeekSameDayStart = new Date(lastWeekSameDay);
    lastWeekSameDayStart.setHours(0, 0, 0, 0);
    const lastWeekSameDayEnd = new Date(lastWeekSameDay);
    lastWeekSameDayEnd.setHours(23, 59, 59, 999);
    
    // Last week period (7-14 days ago) for drone insights
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    lastWeekStart.setHours(0, 0, 0, 0);
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    // Get risk predictions from last week same day
    const riskPredictionsLastWeek = await prisma.companyPrediction.count({
      where: {
        companyId,
        createdAt: {
          gte: lastWeekSameDayStart,
          lte: lastWeekSameDayEnd
        }
      }
    });
    
    // Get drone images uploaded last week (7-14 days ago)
    const droneInsightsLastWeek = await prisma.image.count({
      where: {
        companyId,
        createdAt: {
          gte: lastWeekStart,
          lte: lastWeekEnd
        }
      }
    });
    
    // Get active users count from last week
    // Count users who were verified and existed before last week end
    const activeUsersLastWeek = await prisma.user.count({
      where: {
        companyId,
        status: 'Verified',
        createdAt: {
          lte: lastWeekEnd
        }
      }
    });
    
    console.log(`[GET DASHBOARD HISTORICAL STATS] Successfully retrieved historical stats for company ${companyId}`);
    res.json({
      riskPredictionsLastWeek,
      droneInsightsLastWeek,
      activeUsersLastWeek
    });

  } catch (err) {
    logger.error('[GET DASHBOARD HISTORICAL STATS ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to get dashboard historical stats', err);
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

// POST /users/invite
// Admin invites a new user - password is auto-generated and sent via email
exports.inviteUser = async (req, res) => {
  const { email, role, companyId } = req.body;

  // Validate required fields
  if (!email) {
    logger.warn('[INVITE USER ERROR] Missing email', { email });
    return sendValidationError(res, ['Email is required']);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.warn('[INVITE USER ERROR] Invalid email format', { email });
    return sendValidationError(res, ['Please provide a valid email address']);
  }

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      logger.warn('[INVITE USER ERROR] Email already exists', { email });
      return sendConflictError(res, 'Email already registered');
    }

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId || req.companyId },
      select: { id: true, name: true }
    });

    if (!company) {
      logger.warn('[INVITE USER ERROR] Company not found', { companyId: companyId || req.companyId });
      return sendNotFoundError(res, 'Company');
    }

    // Generate random password
    const generatedPassword = generateRandomPassword(12);
    
    // Hash password
    const hash = await bcrypt.hash(generatedPassword, 10);

    // Generate a temporary name from email (user will update it later)
    const tempName = email.split('@')[0];

    // Create new user with status 'Pending' - requires phone verification on first login
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name: tempName,
        role: role || 'user',
        status: 'Pending', // User needs to verify phone number on first login
        companyId: company.id
      }
    });

    console.log(`[INVITE USER SUCCESS] New user invited: ${email} for company ${company.name}`);

    // Send welcome email with credentials
    const mailOptions = {
      from: email_sender_email,
      to: email,
      subject: `Welcome to DengueEye - Your Account Has Been Created`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1D4ED8, #1E3A8A); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Welcome to DengueEye</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px;">Hello,</p>
            
            <p style="color: #333; font-size: 16px;">
              You have been invited to join <strong>${company.name}</strong> on DengueEye. 
              Below are your login credentials:
            </p>
            
            <div style="background: white; border: 2px solid #1D4ED8; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 5px 0; color: #333;">
                <strong>Email:</strong> ${email}
              </p>
              <p style="margin: 5px 0; color: #333;">
                <strong>Password:</strong> <code style="background: #f1f3f5; padding: 2px 8px; border-radius: 4px;">${generatedPassword}</code>
              </p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>⚠️ Important:</strong> On your first login, you will be required to verify your email address 
                to complete your account setup.
              </p>
            </div>
            
            <p style="color: #333; font-size: 16px;">
              We recommend changing your password after your first login for security purposes.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.MOBILE_APP_URL || process.env.CLIENT_BASE_URL || 'https://drone4dengue.vercel.app/'}" 
                 style="background: #1D4ED8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Login to DengueEye
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
            
            <p style="color: #6c757d; font-size: 12px; text-align: center;">
              If you did not expect this invitation, please ignore this email or contact your administrator.
            </p>
          </div>
        </div>
      `,
      text: `
Welcome to DengueEye!

You have been invited to join ${company.name} on DengueEye.

Your login credentials:
Email: ${email}
Password: ${generatedPassword}

IMPORTANT: On your first login, you will be required to verify your email address to complete your account setup.

We recommend changing your password after your first login for security purposes.

If you did not expect this invitation, please ignore this email or contact your administrator.
      `
    };

    try {
      await sendEmailWithRetry(mailOptions, 3);
      console.log(`[INVITE USER] Welcome email sent to ${email}`);
    } catch (emailErr) {
      console.error(`[INVITE USER] Failed to send welcome email to ${email}:`, emailErr.message);
      // Don't fail the request if email fails - user is still created
    }

    // Notify admins of the organization about the new user
    try {
      const currentUserId = req.user?.userId;
      const admins = await prisma.user.findMany({
        where: {
          companyId: company.id,
          role: 'admin',
          ...(currentUserId ? { id: { not: currentUserId } } : {}) // Exclude the admin who created the user if available
        },
        select: { id: true }
      });

      if (admins.length > 0) {
        const adminIds = admins.map(a => a.id);
        await createNotification({
          title: 'New User Invited',
          message: `A new ${role || 'user'} (${email}) has been invited to ${company.name}. They will need to verify their email address on first login.`,
          type: 'user_invited',
          companyId: company.id,
          userIds: adminIds,
          metadata: {
            newUserEmail: email,
            newUserRole: role || 'user',
            invitedBy: currentUserId
          }
        });
        console.log(`[INVITE USER] Notification sent to ${adminIds.length} admin(s)`);
      }
    } catch (notifyErr) {
      console.error(`[INVITE USER] Failed to notify admins:`, notifyErr.message);
      // Don't fail the request if notification fails
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      ...userWithoutPassword,
      message: 'User invited successfully. Login credentials have been sent to their email.'
    });

  } catch (err) {
    logger.error('[INVITE USER ERROR]', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Failed to invite user', err);
  }
};
