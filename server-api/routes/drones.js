const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');


router.get('/', (req, res) => res.json({ message: 'Get all drones' }));
router.post('/', (req, res) => res.json({ message: 'Create drone' }));
router.get('/:id', (req, res) => res.json({ message: 'Get drone by id' }));
router.put('/:id', (req, res) => res.json({ message: 'Update drone' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete drone' }));

module.exports = router; 