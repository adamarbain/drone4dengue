const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

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

// GET /companies/:id - Get specific company by ID
router.get('/:id', authMiddleware.checkToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the user can access this company (they should only access their own company)
    if (req.companyId !== id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own company.' });
    }
    
    const company = await prisma.company.findUnique({
      where: { 
        id: id,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    
    res.json(company);
  } catch (err) {
    console.error('[COMPANIES ERROR] Failed to fetch company:', err);
    res.status(500).json({ error: 'Failed to fetch company.' });
  }
});

module.exports = router;
