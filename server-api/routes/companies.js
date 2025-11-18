const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const authMiddleware = require('../middleware/authMiddleware');
const companyController = require('../controllers/companyController');

// GET /companies - Get all active companies
router.get('/', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(companies);
  } catch (err) {
    console.error('[COMPANIES ERROR] Failed to fetch companies:', err);
    res.status(500).json({ error: 'Failed to fetch companies.' });
  }
});

// GET /companies/:id - Get specific company by ID (with settings)
router.get('/:id/getcompanybyId', authMiddleware.checkToken, companyController.getCompanyById);

// PATCH /companies/:id/settings - Update company settings
router.patch('/:id/settings', authMiddleware.checkToken, companyController.updateCompanySettings);

module.exports = router;
