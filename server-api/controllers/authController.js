const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const prisma = require('../prisma/client');
const twilio = require('twilio');

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
      try {
        const transporter = nodemailer.createTransport(configs[configIndex]);
        console.log(`[EMAIL] Attempt ${attempt}/${maxRetries} using config ${configIndex + 1} (port ${configs[configIndex].port})`);
        
        // Verify connection before sending (with shorter timeout)
        await Promise.race([
          transporter.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 8000))
        ]);
        console.log(`[EMAIL] Connection verified with config ${configIndex + 1}`);
        
        // Send email
        const info = await Promise.race([
          transporter.sendMail(mailOptions),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 15000))
        ]);
        console.log(`[EMAIL] Email sent successfully:`, info.messageId);
        
        // Close connection
        transporter.close();
        return info;
      } catch (err) {
        lastError = err;
        console.error(`[EMAIL] Config ${configIndex + 1} failed:`, err.message);
        
        // If it's a connection timeout and we have more configs to try, continue
        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ESOCKETTIMEDOUT' || err.message === 'Verification timeout' || err.message === 'Send timeout') {
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

  // Validate required fields
  if (!email || !password || !name || !phone || !username || !companyId) {
    console.log(`[REGISTER ERROR] Missing required fields for ${email}`);
    return res.status(400).json({ error: 'Email, password, name, phone, username, and companyId are required.' });
  }

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`[REGISTER ERROR] Email already exists: ${email}`);
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Check if company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      console.log(`[REGISTER ERROR] Company not found: ${companyId}`);
      return res.status(400).json({ error: 'Invalid company ID.' });
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
        username,
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
    console.error('[REGISTER ERROR] Registration failed:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

exports.registerAdmin = async (req, res) => {
  const { email, password, name, phone, username, companyId } = req.body;

  // Validate required fields
  if (!email || !password || !name || !phone || !username || !companyId) {
    console.log(`[REGISTER ADMIN ERROR] Missing required fields for ${email}`);
    return res.status(400).json({ error: 'Email, password, name, phone, username, and companyId are required.' });
  }

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`[REGISTER ADMIN ERROR] Email already exists: ${email}`);
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Check if company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      console.log(`[REGISTER ADMIN ERROR] Company not found: ${companyId}`);
      return res.status(400).json({ error: 'Invalid company ID.' });
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
    console.error('[REGISTER ADMIN ERROR] Registration failed:', err);
    res.status(500).json({ error: 'Registration failed.' });
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
    console.error('[LOGIN ERROR] Login failed:', err);
    res.status(500).json({ error: 'Login failed.' });
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
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    
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
    console.error('[RESET REQUEST ERROR] Error details:', {
      code: err.code,
      command: err.command,
      message: err.message,
    });
    
    // Return error response
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ESOCKETTIMEDOUT') {
      console.error('[RESET REQUEST ERROR] Connection timeout or network error - email service may be unavailable');
      res.status(503).json({ error: 'Email service temporarily unavailable. Please try again later.' });
    } else if (err.code === 'EAUTH') {
      console.error('[RESET REQUEST ERROR] Authentication failed - check email credentials');
      res.status(500).json({ error: 'Email configuration error. Please contact support.' });
    } else {
      res.status(500).json({ error: 'Failed to send reset code. Please try again later.' });
    }
  }
};

exports.resetVerify = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required.' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.resetCode !== code || !user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }
  res.json({ message: 'Code verified.' });
};

exports.reset = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'Email, code, and new password required.' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.resetCode !== code || !user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { password: hash, resetCode: null, resetCodeExpiry: null } });
  res.json({ message: 'Password reset successful.' });
};

exports.forgotPassword = (req, res) => {
  // Not implemented in original auth.js, kept for compatibility
  res.status(501).json({ error: 'Not implemented' });
};

// --- EMAIL OTP VERIFICATION ---

// POST /auth/send-otp
exports.sendOtp = async (req, res) => {
  let { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
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
    console.error('[SEND OTP ERROR]', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
};

// POST /auth/verify-otp
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ error: 'OTP not requested or expired.' });
    }
    if (user.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP expired.' });
    }
    // Mark user as Verified and clear OTP fields
    await prisma.user.update({
      where: { email },
      data: { status: 'Verified', otpCode: null, otpExpiry: null },
    });
    res.json({ message: 'Account verified.' });
  } catch (err) {
    console.error('[VERIFY OTP ERROR]', err);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
}; 