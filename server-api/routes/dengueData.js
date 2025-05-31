const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');


router.get('/', (req, res) => res.json({ message: 'Get all dengue data' }));
router.post('/', (req, res) => res.json({ message: 'Add dengue data' }));
router.get('/:id', (req, res) => res.json({ message: 'Get dengue data by id' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete dengue data' }));

module.exports = router; 