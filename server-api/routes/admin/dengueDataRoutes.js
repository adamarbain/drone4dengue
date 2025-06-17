const express = require('express');
const router = express.Router();
const { checkToken, checkRole } = require('../../middleware/authMiddleware');
const { getSummary, getAll, getOne, create, update, remove, uploadCSV, getHistorical, getMapData, exportData } = require('../../controllers/dengueDataController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/summary/dengue-data', checkToken, checkRole('admin'), getSummary);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/upload', checkToken, checkRole('admin'), upload.single('file'), uploadCSV);
router.get('/historical/dengue-data', getHistorical);
router.get('/map/location', getMapData);
router.get('/export', exportData);

module.exports = router; 