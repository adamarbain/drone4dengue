const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');


router.get('/', (req, res) => res.json({ message: 'Get all users' }));
router.get('/:id', (req, res) => res.json({ message: 'Get user by id' }));
router.put('/:id', (req, res) => res.json({ message: 'Update user' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete user' }));

module.exports = router; 