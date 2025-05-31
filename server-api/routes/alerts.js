const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');


router.get('/', (req, res) => res.json({ message: 'Get all alerts' }));
router.post('/', (req, res) => res.json({ message: 'Create alert' }));
router.get('/:id', (req, res) => res.json({ message: 'Get alert by id' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete alert' }));

module.exports = router; 