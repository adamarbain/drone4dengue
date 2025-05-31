const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');


router.get('/', (req, res) => res.json({ message: 'Get all reports' }));
router.post('/', (req, res) => res.json({ message: 'Create report' }));
router.get('/:id', (req, res) => res.json({ message: 'Get report by id' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete report' }));

module.exports = router; 