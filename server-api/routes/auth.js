const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const dotenv = require('dotenv');
dotenv.config();

const email_sender_email = process.env.SENDER_EMAIL;
const email_sender_password = process.env.SENDER_EMAIL_PW;

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  const missingFields = [];
  if (!email) missingFields.push("email");
  if (!password) missingFields.push("password");
  if (!name) missingFields.push("name");
  if (!phone) missingFields.push("phone");
  if (missingFields.length > 0) {
    console.log(`[REGISTER ERROR] Missing required fields for ${email || '[no email provided]'}: ${missingFields.join(', ')}`);
    return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`[REGISTER ERROR] Email already exists: ${email}`);
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, name, phone, role: 'user' },
    });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[REGISTER SUCCESS] New user registered: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role } });
  } catch (err) {
    console.error('[REGISTER ERROR] Registration failed:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
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
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[LOGIN SUCCESS] User logged in: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('[LOGIN ERROR] Login failed:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /auth/reset-request (step 3-4)
router.post('/reset-request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  // Generate code and expiry
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  await prisma.user.update({ where: { email }, data: { resetCode: code, resetCodeExpiry: expiry } });
  // Simulate email
  console.log(`[RESET REQUEST] Sending reset code to ${email} from ${email_sender_email} with app password ${email_sender_password}`);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email_sender_email,
      pass: email_sender_password, // Use an App Password if 2FA is enabled
    },
  });

  const mailOptions = {
    from: email_sender_email,
    to: email,
    subject: 'DengueEye - Your Password Reset Code',
    text: `Your reset code is: ${code}`,
    html: `<p>Your reset code is: ${code}</p>`,
  };

  await transporter.sendMail(mailOptions);
  res.json({ message: 'Reset code sent to email.' });
});

// POST /auth/reset-verify (step 5)
router.post('/reset-verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required.' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.resetCode !== code || !user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }
  res.json({ message: 'Code verified.' });
});

// POST /auth/reset (step 6-8)
router.post('/reset', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'Email, code, and new password required.' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.resetCode !== code || !user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { password: hash, resetCode: null, resetCodeExpiry: null } });
  res.json({ message: 'Password reset successful.' });
});

module.exports = router; 