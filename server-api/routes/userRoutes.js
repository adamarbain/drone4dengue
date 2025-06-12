const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { checkToken } = require('../middleware/authMiddleware');

// PATCH /users/:id
router.patch('/:id', checkToken, userController.updateProfile);

// GET /users/:id
router.get('/:id', checkToken, userController.getUserById);

module.exports = router;
