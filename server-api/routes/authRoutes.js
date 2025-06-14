const express = require('express');
const router = express.Router();
const { login, registerUser, registerAdmin, resetVerify, reset, resetRequest, sendOtp, verifyOtp } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/reset-request', resetRequest);
router.post('/reset-verify', resetVerify);
router.post('/reset', reset);
router.post('/send/email-otp', sendOtp);
router.post('/verify/email-otp', verifyOtp);

module.exports = router; 