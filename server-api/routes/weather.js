const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');


router.get('/', (req, res) => res.json({ message: 'Get all weather data' }));
router.post('/', (req, res) => res.json({ message: 'Add weather data' }));
router.get('/:id', (req, res) => res.json({ message: 'Get weather by id' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete weather' }));

module.exports = router; 