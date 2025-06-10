const express = require('express');
const router = express.Router();
const { login, registerUser, registerAdmin, resetVerify, reset, resetRequest } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/reset-request', resetRequest);
router.post('/reset-verify', resetVerify);
router.post('/reset', reset);

module.exports = router; 