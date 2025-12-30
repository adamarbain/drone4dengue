const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const prisma = require('../prisma/client');
const twilio = require('twilio');
const logger = require('../utils/logger');
const admin = require('firebase-admin');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendUnauthorizedError,
  sendForbiddenError,
  sendConflictError,
  sendInternalError
} = require('../utils/errorResponse');

// Initialize Firebase Admin for Google Auth verification (separate from storage)
// Use the existing Firebase Admin instance if already initialized
let firebaseAuthApp;
try {
  // Check if default app exists
  firebaseAuthApp = admin.app();
  console.log('[FIREBASE AUTH] Using existing Firebase Admin instance');
} catch (error) {
  // If no default app, it will be initialized by firebase_storage_utils
  console.log('[FIREBASE AUTH] Firebase Admin will be initialized by storage utils');
}

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const email_sender_email = process.env.SENDER_EMAIL;
const email_sender_password = process.env.SENDER_EMAIL_PW;

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const twilio_phone_number = process.env.TWILIO_PHONE_NUMBER;

// SMTP configurations for production compatibility
const getEmailConfigs = () => [
  // Configuration 1: Port 587 with STARTTLS (most common)
  {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: email_sender_email,
      pass: email_sender_password,
    },
    connectionTimeout: 10000, // 10 seconds - shorter for faster failure
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    requireTLS: true,
  },
  // Configuration 2: Port 465 with SSL (alternative)
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
    // Try each configuration
    for (let configIndex = 0; configIndex < configs.length; configIndex++) {
      let transporter = null;
      try {
        transporter = nodemailer.createTransport(configs[configIndex]);
        console.log(`[EMAIL] Attempt ${attempt}/${maxRetries} using config ${configIndex + 1} (port ${configs[configIndex].port})`);
        
        // Try to verify connection (optional - skip if it times out)
        try {
          await Promise.race([
            transporter.verify(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 5000))
          ]);
          console.log(`[EMAIL] Connection verified with config ${configIndex + 1}`);
        } catch (verifyErr) {
          // Verification failed/timed out, but we'll still try to send
          console.log(`[EMAIL] Verification skipped for config ${configIndex + 1} (${verifyErr.message}), attempting to send directly...`);
        }
        
        // Send email with timeout protection
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Send timeout')), 20000)
        );
        
        const info = await Promise.race([sendPromise, timeoutPromise]);
        console.log(`[EMAIL] Email sent successfully:`, info.messageId || 'messageId not available');
        
        // Close connection if possible
        if (transporter && transporter.close) {
          transporter.close();
        }
        return info;
      } catch (err) {
        lastError = err;
        const errorCode = err.code || (err.message && err.message.includes('timeout') ? 'ETIMEDOUT' : undefined);
        console.error(`[EMAIL] Config ${configIndex + 1} failed:`, {
          message: err.message,
          code: errorCode,
          command: err.command
        });
        
        // Clean up transporter
        if (transporter && transporter.close) {
          try {
            transporter.close();
          } catch (closeErr) {
            // Ignore close errors
          }
        }
        
        // If it's a connection/timeout error and we have more configs to try, continue
        if (errorCode === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ESOCKETTIMEDOUT' || 
            err.message === 'Verification timeout' || err.message === 'Send timeout' ||
            err.message?.includes('timeout')) {
          if (configIndex < configs.length - 1) {
            console.log(`[EMAIL] Trying next configuration...`);
            continue; // Try next config
          }
          // If this was the last config, break and retry with delay
          break;
        }
        
        // For auth errors, don't retry other configs
        if (err.code === 'EAUTH' || err.code === 'EENVELOPE') {
          throw err;
        }
      }
    }
    
    // If all configs failed and we have retries left, wait and retry
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
      console.log(`[EMAIL] All configs failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Failed to send email after all retries');
};

exports.registerUser = async (req, res) => {
  const { email, password, name, phone, username, companyId } = req.body;

  // Validate required fields individually and report which are missing
  const missingFields = [];
  if (!email) missingFields.push('email');
  if (!password) missingFields.push('password');
  if (!companyId) missingFields.push('companyId');
  if (missingFields.length > 0) {
    logger.warn('[REGISTER ERROR] Missing required fields', { email: email || '[no email provided]', missingFields });
    return sendValidationError(res, [`Missing required fields: ${missingFields.join(', ')}`]);
  }

  // Auto-generate name and username from email if not provided
  const emailPrefix = email.split('@')[0];
  const generatedName = name || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).replace(/[._-]/g, ' ');
  const generatedUsername = username || emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      logger.warn('[REGISTER ERROR] Email already exists', { email });
      return sendConflictError(res, 'Email already registered');
    }

    // Check if company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      logger.warn('[REGISTER ERROR] Company not found', { companyId });
      return sendNotFoundError(res, 'Company');
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create new user (phone is optional, can be added later via edit profile)
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name: generatedName,
        phone: phone || null,
        username: generatedUsername,
        role: 'user',
        status: 'Pending',
        companyId
      }
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, role: user.role, companyId: user.companyId }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[REGISTER SUCCESS] New user registered: ${email}`);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });

  } catch (err) {
    logger.error('[REGISTER ERROR] Registration failed', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Registration failed', err);
  }
};

exports.registerAdmin = async (req, res) => {
  const { email, password, name, phone, username, companyId } = req.body;

  // Validate required fields
  if (!email || !password || !name || !phone || !username || !companyId) {
    logger.warn('[REGISTER ADMIN ERROR] Missing required fields', { email });
    const missingFields = [];
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!name) missingFields.push('name');
    if (!phone) missingFields.push('phone');
    if (!username) missingFields.push('username');
    if (!companyId) missingFields.push('companyId');
    return sendValidationError(res, [`Missing required fields: ${missingFields.join(', ')}`]);
  }

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      logger.warn('[REGISTER ADMIN ERROR] Email already exists', { email });
      return sendConflictError(res, 'Email already registered');
    }

    // Check if company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      logger.warn('[REGISTER ADMIN ERROR] Company not found', { companyId });
      return sendNotFoundError(res, 'Company');
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create new admin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        phone,
        username,
        role: 'admin',
        status: 'Verified', // Admins are automatically verified
        companyId
      }
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, role: user.role, companyId: user.companyId }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[REGISTER ADMIN SUCCESS] New admin registered: ${email}`);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });

  } catch (err) {
    logger.error('[REGISTER ADMIN ERROR] Registration failed', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Registration failed', err);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.log(`[LOGIN ERROR] Missing credentials for ${email}`);
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[LOGIN ERROR] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`[LOGIN ERROR] Invalid password for user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role, companyId: user.companyId }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[LOGIN SUCCESS] User logged in: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId } });
  } catch (err) {
    logger.error('[LOGIN ERROR] Login failed', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Login failed', err);
  }
};

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.log(`[ADMIN LOGIN ERROR] Missing credentials for ${email}`);
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[ADMIN LOGIN ERROR] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (user.role !== 'admin') {
      console.log(`[ADMIN LOGIN ERROR] User is not an admin: ${email}`);
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`[ADMIN LOGIN ERROR] Invalid password for admin: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role, companyId: user.companyId }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[ADMIN LOGIN SUCCESS] Admin logged in: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId } });
  }
  catch (err) {
    console.error('[ADMIN LOGIN ERROR] Login failed:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
}

exports.resetRequest = async (req, res) => {
  const { email } = req.body;
  if (!email) return sendValidationError(res, ['Email is required']);
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return sendNotFoundError(res, 'User');
    
    // Generate code and expiry
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await prisma.user.update({ where: { email }, data: { resetCode: code, resetCodeExpiry: expiry } });
    
    // Send email with retry logic
    console.log(`[RESET REQUEST] Sending reset code to ${email} from ${email_sender_email}`);
    
    const mailOptions = {
      from: email_sender_email,
      to: email,
      subject: 'DengueEye - Your Password Reset Code',
      text: `Your reset code is: ${code}`,
      html: `<p>Your reset code is: <strong>${code}</strong></p><p>This code will expire in 15 minutes.</p>`,
    };

    await sendEmailWithRetry(mailOptions, 3);
    console.log(`[RESET REQUEST SUCCESS] Reset code sent to ${email}`);
    res.json({ message: 'Reset code sent to email.' });
  } catch (err) {
    console.error('[RESET REQUEST ERROR] Failed to send reset code:', err);
    const errorCode = err.code || (err.message?.includes('timeout') ? 'ETIMEDOUT' : undefined);
    console.error('[RESET REQUEST ERROR] Error details:', {
      code: errorCode,
      command: err.command,
      message: err.message,
    });
    
    // Return error response
    logger.error('[RESET REQUEST ERROR] Failed to send reset code', { 
      error: err.message, 
      code: errorCode,
      email 
    });
    
    if (errorCode === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ESOCKETTIMEDOUT' || 
        err.message?.includes('timeout') || err.message === 'Verification timeout' || err.message === 'Send timeout') {
      return sendErrorResponse(res, 503, 'Email service temporarily unavailable. Please try again later.', 'SERVICE_UNAVAILABLE');
    } else if (err.code === 'EAUTH') {
      return sendErrorResponse(res, 500, 'Email configuration error. Please contact support.', 'EMAIL_CONFIG_ERROR');
    } else {
      return sendInternalError(res, 'Failed to send reset code. Please try again later.', err);
    }
  }
};

exports.resetVerify = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return sendValidationError(res, ['Email and code are required']);
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.resetCode !== code || !user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
      return sendValidationError(res, ['Invalid or expired code']);
    }
    res.json({ message: 'Code verified.' });
  } catch (err) {
    logger.error('[RESET VERIFY ERROR]', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Failed to verify code', err);
  }
};

exports.reset = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return sendValidationError(res, ['Email, code, and new password are required']);
  }
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.resetCode !== code || !user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
      return sendValidationError(res, ['Invalid or expired code']);
    }
    
    if (newPassword.length < 6) {
      return sendValidationError(res, ['Password must be at least 6 characters']);
    }
    
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { password: hash, resetCode: null, resetCodeExpiry: null } });
    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    logger.error('[RESET ERROR]', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Failed to reset password', err);
  }
};

exports.forgotPassword = (req, res) => {
  // Not implemented in original auth.js, kept for compatibility
  return sendErrorResponse(res, 501, 'Not implemented', 'NOT_IMPLEMENTED');
};

// --- EMAIL OTP VERIFICATION ---

// POST /auth/send-otp
exports.sendOtp = async (req, res) => {
  let { email } = req.body;
  if (!email) return sendValidationError(res, ['Email is required']);
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return sendNotFoundError(res, 'User');
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    await prisma.user.update({ where: { email }, data: { otpCode: otp, otpExpiry: expiry } });
    // Send OTP via email with retry logic
    const mailOptions = {
      from: email_sender_email,
      to: email,
      subject: 'DengueEye - Your OTP Code',
      text: `Your OTP code is: ${otp}`,
      html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
    };
    
    await sendEmailWithRetry(mailOptions, 3);
    console.log(`[SEND OTP SUCCESS] OTP sent to ${email}`);
    res.json({ message: 'OTP sent to email.' });
  } catch (err) {
    logger.error('[SEND OTP ERROR]', { error: err.message, stack: err.stack, email });
    const errorCode = err.code || (err.message?.includes('timeout') ? 'ETIMEDOUT' : undefined);
    
    if (errorCode === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ESOCKETTIMEDOUT') {
      return sendErrorResponse(res, 503, 'Email service temporarily unavailable. Please try again later.', 'SERVICE_UNAVAILABLE');
    } else if (err.code === 'EAUTH') {
      return sendErrorResponse(res, 500, 'Email configuration error. Please contact support.', 'EMAIL_CONFIG_ERROR');
    } else {
      return sendInternalError(res, 'Failed to send OTP', err);
    }
  }
};

// POST /auth/verify-otp
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return sendValidationError(res, ['Email and OTP are required']);
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.otpCode || !user.otpExpiry) {
      return sendValidationError(res, ['OTP not requested or expired']);
    }
    if (user.otpCode !== otp) {
      return sendValidationError(res, ['Invalid OTP']);
    }
    if (new Date() > user.otpExpiry) {
      return sendValidationError(res, ['OTP expired']);
    }
    // Mark user as Verified and clear OTP fields
    await prisma.user.update({
      where: { email },
      data: { status: 'Verified', otpCode: null, otpExpiry: null },
    });
    res.json({ message: 'Account verified.' });
  } catch (err) {
    logger.error('[VERIFY OTP ERROR]', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Failed to verify OTP', err);
  }
};

// --- PHONE OTP VERIFICATION (SMS via Twilio) ---

// POST /auth/send/phone-otp
exports.sendPhoneOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return sendValidationError(res, ['Phone number is required']);
  
  // Validate phone number format (basic validation)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
    return sendValidationError(res, ['Please provide a valid phone number with country code (e.g., +60123456789)']);
  }

  try {
    // Find user by phone number
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) return sendNotFoundError(res, 'User with this phone number');

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    // Store OTP in database
    await prisma.user.update({ 
      where: { id: user.id }, 
      data: { otpCode: otp, otpExpiry: expiry } 
    });

    // Send OTP via SMS using Twilio
    if (!twilio_phone_number || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('[SEND PHONE OTP ERROR] Twilio not configured');
      return sendErrorResponse(res, 503, 'SMS service not configured. Please contact support.', 'SERVICE_UNAVAILABLE');
    }

    try {
      await twilioClient.messages.create({
        body: `Your DengueEye verification code is: ${otp}. This code expires in 10 minutes.`,
        from: twilio_phone_number,
        to: phone
      });
      console.log(`[SEND PHONE OTP SUCCESS] OTP sent to ${phone}`);
      res.json({ message: 'OTP sent to your phone number.' });
    } catch (smsErr) {
      console.error('[SEND PHONE OTP ERROR] Twilio error:', smsErr.message);
      logger.error('[SEND PHONE OTP ERROR]', { error: smsErr.message, phone });
      
      if (smsErr.code === 21211 || smsErr.code === 21614) {
        return sendValidationError(res, ['Invalid phone number format. Please include country code (e.g., +60123456789)']);
      } else if (smsErr.code === 21608) {
        return sendErrorResponse(res, 503, 'SMS service is not available for this region.', 'SERVICE_UNAVAILABLE');
      } else {
        return sendErrorResponse(res, 503, 'Failed to send SMS. Please try again later.', 'SERVICE_UNAVAILABLE');
      }
    }
  } catch (err) {
    logger.error('[SEND PHONE OTP ERROR]', { error: err.message, stack: err.stack, phone });
    return sendInternalError(res, 'Failed to send OTP', err);
  }
};

// POST /auth/verify/phone-otp
exports.verifyPhoneOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return sendValidationError(res, ['Phone number and OTP are required']);
  
  try {
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) return sendNotFoundError(res, 'User with this phone number');
    
    if (!user.otpCode || !user.otpExpiry) {
      return sendValidationError(res, ['OTP not requested or expired']);
    }
    if (user.otpCode !== otp) {
      return sendValidationError(res, ['Invalid OTP']);
    }
    if (new Date() > user.otpExpiry) {
      return sendValidationError(res, ['OTP expired']);
    }

    // Mark user as Verified and clear OTP fields
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'Verified', otpCode: null, otpExpiry: null },
    });

    console.log(`[VERIFY PHONE OTP SUCCESS] User verified: ${user.email}`);
    res.json({ message: 'Phone number verified successfully. Your account is now verified.' });
  } catch (err) {
    logger.error('[VERIFY PHONE OTP ERROR]', { error: err.message, stack: err.stack, phone });
    return sendInternalError(res, 'Failed to verify OTP', err);
  }
};

// POST /auth/update-phone - Update phone number and send OTP for verification
exports.updatePhoneAndSendOtp = async (req, res) => {
  const { newPhone, userId } = req.body;
  if (!newPhone) return sendValidationError(res, ['New phone number is required']);
  
  // Validate phone number format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(newPhone.replace(/[\s-]/g, ''))) {
    return sendValidationError(res, ['Please provide a valid phone number with country code (e.g., +60123456789)']);
  }

  try {
    // Get user from token or userId
    const targetUserId = userId || req.userId;
    if (!targetUserId) return sendValidationError(res, ['User ID is required']);

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return sendNotFoundError(res, 'User');

    // Check if phone number is already in use by another user
    const existingUser = await prisma.user.findFirst({ 
      where: { 
        phone: newPhone,
        id: { not: targetUserId }
      } 
    });
    if (existingUser) {
      return sendConflictError(res, 'This phone number is already registered to another account');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    // Store OTP and pending phone number
    await prisma.user.update({ 
      where: { id: targetUserId }, 
      data: { 
        otpCode: otp, 
        otpExpiry: expiry,
        // Store the new phone temporarily - we'll update it after verification
      } 
    });

    // Send OTP via SMS
    if (!twilio_phone_number || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('[UPDATE PHONE OTP ERROR] Twilio not configured');
      return sendErrorResponse(res, 503, 'SMS service not configured. Please contact support.', 'SERVICE_UNAVAILABLE');
    }

    try {
      await twilioClient.messages.create({
        body: `Your DengueEye verification code is: ${otp}. This code expires in 10 minutes.`,
        from: twilio_phone_number,
        to: newPhone
      });
      console.log(`[UPDATE PHONE OTP SUCCESS] OTP sent to ${newPhone}`);
      res.json({ message: 'OTP sent to your new phone number.' });
    } catch (smsErr) {
      console.error('[UPDATE PHONE OTP ERROR] Twilio error:', smsErr.message);
      if (smsErr.code === 21211 || smsErr.code === 21614) {
        return sendValidationError(res, ['Invalid phone number format. Please include country code (e.g., +60123456789)']);
      }
      return sendErrorResponse(res, 503, 'Failed to send SMS. Please try again later.', 'SERVICE_UNAVAILABLE');
    }
  } catch (err) {
    logger.error('[UPDATE PHONE OTP ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to send OTP', err);
  }
};

// POST /auth/verify-phone-update - Verify OTP and update phone number
exports.verifyPhoneUpdate = async (req, res) => {
  const { newPhone, otp, userId } = req.body;
  if (!newPhone || !otp) return sendValidationError(res, ['Phone number and OTP are required']);
  
  try {
    const targetUserId = userId || req.userId;
    if (!targetUserId) return sendValidationError(res, ['User ID is required']);

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return sendNotFoundError(res, 'User');
    
    if (!user.otpCode || !user.otpExpiry) {
      return sendValidationError(res, ['OTP not requested or expired']);
    }
    if (user.otpCode !== otp) {
      return sendValidationError(res, ['Invalid OTP']);
    }
    if (new Date() > user.otpExpiry) {
      return sendValidationError(res, ['OTP expired']);
    }

    // Update phone number and mark as verified
    await prisma.user.update({
      where: { id: targetUserId },
      data: { 
        phone: newPhone,
        status: 'Verified', 
        otpCode: null, 
        otpExpiry: null 
      },
    });

    console.log(`[VERIFY PHONE UPDATE SUCCESS] Phone updated for user: ${user.email}`);
    res.json({ message: 'Phone number updated and verified successfully.' });
  } catch (err) {
    logger.error('[VERIFY PHONE UPDATE ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to verify OTP', err);
  }
};

// POST /auth/change-password - Change password for authenticated user
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, userId } = req.body;
  if (!currentPassword || !newPassword) {
    return sendValidationError(res, ['Current password and new password are required']);
  }

  if (newPassword.length < 6) {
    return sendValidationError(res, ['New password must be at least 6 characters']);
  }

  try {
    // Get userId from token (req.user.userId) or from body
    const targetUserId = userId || req.user?.userId;
    if (!targetUserId) return sendValidationError(res, ['User ID is required']);

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return sendNotFoundError(res, 'User');

    // Check if user signed up with Google (no password)
    if (!user.password && user.authProvider === 'google') {
      return sendValidationError(res, ['Cannot change password for Google Sign-In accounts. Please use Google to sign in.']);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return sendValidationError(res, ['Current password is incorrect']);
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: hash }
    });

    console.log(`[CHANGE PASSWORD SUCCESS] Password changed for user: ${user.email}`);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    logger.error('[CHANGE PASSWORD ERROR]', { error: err.message, stack: err.stack });
    return sendInternalError(res, 'Failed to change password', err);
  }
};

// --- GOOGLE AUTHENTICATION ---

// POST /auth/google - Authenticate with Google Sign-In
exports.googleAuth = async (req, res) => {
  const { idToken, email, name, profilePicture, googleId } = req.body;

  if (!idToken || !email || !googleId) {
    return sendValidationError(res, ['ID token, email, and Google ID are required']);
  }

  try {
    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log(`[GOOGLE AUTH] Token verified for: ${decodedToken.email}`);
    } catch (tokenError) {
      console.error('[GOOGLE AUTH] Token verification failed:', tokenError.message);
      return sendUnauthorizedError(res, 'Invalid or expired Google token');
    }

    // Verify the token email matches the provided email
    if (decodedToken.email !== email) {
      return sendUnauthorizedError(res, 'Token email mismatch');
    }

    // Check if user already exists by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleId },
          { email: email }
        ]
      }
    });

    let isNewUser = false;
    let requiresVerification = false;

    if (user) {
      // Existing user found
      console.log(`[GOOGLE AUTH] Existing user found: ${user.email}`);

      // If user exists with email but not linked to Google, link the account
      if (!user.googleId) {
        console.log(`[GOOGLE AUTH] Linking Google account to existing user: ${user.email}`);
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleId,
            profilePicture: profilePicture || user.profilePicture,
            authProvider: user.authProvider === 'email' ? 'email' : 'google', // Keep email if they had password
          }
        });
      }

      // Check if user needs verification
      if (user.status !== 'Verified') {
        requiresVerification = true;
      }

      // Prevent admin users from logging in through mobile app
      if (user.role === 'admin') {
        return sendForbiddenError(res, 'Admin users cannot log in through the mobile app. Please use the admin portal.');
      }
    } else {
      // New user - create account
      isNewUser = true;
      requiresVerification = true; // New users need to verify via OTP

      // Auto-generate username from email
      const emailPrefix = email.split('@')[0];
      const generatedUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Get the public mobile user company (comp-999)
      const publicCompany = await prisma.company.findFirst({
        where: { id: 'comp-999' }
      });

      if (!publicCompany) {
        console.error('[GOOGLE AUTH] Public company comp-999 not found');
        return sendInternalError(res, 'System configuration error. Please contact support.');
      }

      user = await prisma.user.create({
        data: {
          email: email,
          password: null, // No password for Google users
          name: name || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1),
          username: generatedUsername,
          role: 'user',
          status: 'Pending', // Requires OTP verification
          authProvider: 'google',
          googleId: googleId,
          profilePicture: profilePicture,
          companyId: publicCompany.id,
        }
      });

      console.log(`[GOOGLE AUTH] New user created: ${user.email}`);

      // Send OTP email for verification
      try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
        
        await prisma.user.update({
          where: { id: user.id },
          data: { otpCode: otp, otpExpiry: expiry }
        });

        const mailOptions = {
          from: email_sender_email,
          to: email,
          subject: 'DengueEye - Verify Your Account',
          text: `Welcome to DengueEye! Your verification code is: ${otp}`,
          html: `
            <h2>Welcome to DengueEye!</h2>
            <p>Thank you for signing up with Google. Please verify your account using the code below:</p>
            <p style="font-size: 24px; font-weight: bold; color: #1D4ED8;">${otp}</p>
            <p>This code will expire in 10 minutes.</p>
          `,
        };

        await sendEmailWithRetry(mailOptions, 2);
        console.log(`[GOOGLE AUTH] Verification OTP sent to ${email}`);
      } catch (emailError) {
        console.error('[GOOGLE AUTH] Failed to send verification email:', emailError.message);
        // Don't fail the registration, user can request OTP again
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role, companyId: user.companyId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[GOOGLE AUTH SUCCESS] User authenticated: ${user.email}, isNewUser: ${isNewUser}, requiresVerification: ${requiresVerification}`);

    // Return user data without sensitive fields
    const { password: _, otpCode: __, otpExpiry: ___, resetCode: ____, resetCodeExpiry: _____, ...userWithoutSensitive } = user;

    res.json({
      token,
      user: userWithoutSensitive,
      isNewUser,
      requiresVerification,
    });
  } catch (err) {
    logger.error('[GOOGLE AUTH ERROR]', { error: err.message, stack: err.stack, email });
    return sendInternalError(res, 'Google authentication failed', err);
  }
};

// POST /auth/link-google - Link existing account with Google
exports.linkGoogleAccount = async (req, res) => {
  const { idToken, googleId, profilePicture } = req.body;
  const userId = req.user?.userId;

  if (!idToken || !googleId) {
    return sendValidationError(res, ['ID token and Google ID are required']);
  }

  if (!userId) {
    return sendUnauthorizedError(res, 'Authentication required');
  }

  try {
    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (tokenError) {
      console.error('[LINK GOOGLE] Token verification failed:', tokenError.message);
      return sendUnauthorizedError(res, 'Invalid or expired Google token');
    }

    // Get current user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return sendNotFoundError(res, 'User');
    }

    // Check if Google account is already linked to another user
    const existingGoogleUser = await prisma.user.findFirst({
      where: {
        googleId: googleId,
        id: { not: userId }
      }
    });

    if (existingGoogleUser) {
      return sendConflictError(res, 'This Google account is already linked to another user');
    }

    // Check if user already has Google linked
    if (user.googleId) {
      return sendConflictError(res, 'Your account is already linked to a Google account');
    }

    // Link Google account
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        googleId: googleId,
        profilePicture: profilePicture || user.profilePicture,
      }
    });

    console.log(`[LINK GOOGLE SUCCESS] Google account linked for user: ${user.email}`);

    const { password: _, otpCode: __, otpExpiry: ___, resetCode: ____, resetCodeExpiry: _____, ...userWithoutSensitive } = updatedUser;

    res.json({
      message: 'Google account linked successfully',
      user: userWithoutSensitive,
    });
  } catch (err) {
    logger.error('[LINK GOOGLE ERROR]', { error: err.message, stack: err.stack, userId });
    return sendInternalError(res, 'Failed to link Google account', err);
  }
}; 