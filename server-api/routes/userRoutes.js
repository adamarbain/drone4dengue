const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { checkToken } = require('../middleware/authMiddleware');

// PATCH /users/:id
router.patch('/:id', checkToken, userController.updateProfile);

// GET /users/:id
router.get('/:id', checkToken, userController.getUserById);

// PATCH /users/:id/password
router.patch('/:id/password', checkToken, userController.updatePassword);

// GET /users
router.get('/', checkToken, userController.getAllUsers);

// POST /users
router.post('/', checkToken, userController.createUser);

// POST /users/invite - Admin invites a new user (auto-generates password and sends email)
router.post('/invite', checkToken, userController.inviteUser);

// DELETE /users/:id
router.delete('/:id', checkToken, userController.deleteUser);

// POST /users/bulk-delete
router.post('/bulk-delete', checkToken, userController.bulkDeleteUsers);

// PUT /users/:id/permissions
router.put('/:id/permissions', checkToken, userController.updateUserPermission);

// GET /users/summary
router.get('/summary/dashboard', checkToken, userController.getUserSummary);

// GET /users/dashboard/historical-stats
router.get('/dashboard/historical-stats', checkToken, userController.getDashboardHistoricalStats);

// PUT /users/:id/status
router.put('/:id/status', checkToken, userController.adminUpdateUserStatus);

module.exports = router;
