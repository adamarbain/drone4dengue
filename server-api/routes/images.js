const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');


router.get('/', (req, res) => res.json({ message: 'Get all images' }));
router.post('/', (req, res) => res.json({ message: 'Upload image' }));
router.get('/:id', (req, res) => res.json({ message: 'Get image by id' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete image' }));

module.exports = router; 