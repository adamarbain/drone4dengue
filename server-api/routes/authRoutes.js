const express = require('express');
const router = express.Router();
const { 
  login, 
  adminLogin, 
  registerUser, 
  registerAdmin, 
  resetVerify, 
  reset, 
  resetRequest, 
  sendOtp, 
  verifyOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  updatePhoneAndSendOtp,
  verifyPhoneUpdate,
  changePassword,
  googleAuth,
  linkGoogleAccount
} = require('../controllers/authController');
const { checkToken } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/reset-request', resetRequest);
router.post('/reset-verify', resetVerify);
router.post('/reset', reset);

// Google Authentication
router.post('/google', googleAuth);
router.post('/link-google', checkToken, linkGoogleAccount);

// Email OTP verification
router.post('/send/email-otp', sendOtp);
router.post('/verify/email-otp', verifyOtp);

// Phone OTP verification (SMS via Twilio)
router.post('/send/phone-otp', checkToken, sendPhoneOtp);
router.post('/verify/phone-otp', checkToken, verifyPhoneOtp);

// Update phone number with OTP verification
router.post('/update-phone', checkToken, updatePhoneAndSendOtp);
router.post('/verify-phone-update', checkToken, verifyPhoneUpdate);

// Change password for authenticated user
router.post('/change-password', checkToken, changePassword);

module.exports = router; 