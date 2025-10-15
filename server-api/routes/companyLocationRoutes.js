const express = require('express');
const router = express.Router();
const companyLocationController = require('../controllers/companyLocationController');
const { checkToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(checkToken);

// GET /company-locations - Get all company locations
router.get('/', companyLocationController.getAll);

// GET /company-locations/:id - Get one company location
router.get('/:id', companyLocationController.getOne);

// POST /company-locations - Create new company location
router.post('/', companyLocationController.create);

// PUT /company-locations/:id - Update company location
router.put('/:id', companyLocationController.update);

// DELETE /company-locations/:id - Delete company location
router.delete('/:id', companyLocationController.remove);

// PATCH /company-locations/:id/toggle - Toggle location active status
router.patch('/:id/toggle', companyLocationController.toggleStatus);

module.exports = router;
