const express = require('express');
const router = express.Router();
const { checkToken, checkRole } = require('../../middleware/authMiddleware');
const { getSummary, getAll, getOne, create, update, remove, uploadCSV, getHistorical, getMapData, exportData, getLocations, generateReport, getNearbyCases } = require('../../controllers/dengueDataController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/summary/dengue-data', checkToken, checkRole('admin'), getSummary);
router.get('/locations', getLocations);
router.get('/generate-report', checkToken, checkRole('admin'), generateReport);
router.get('/nearby', getNearbyCases); // Public endpoint for nearby cases
router.get('/export', exportData);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/upload', checkToken, checkRole('admin'), upload.single('file'), uploadCSV);
router.get('/historical/dengue-data', getHistorical);
router.get('/map/location', getMapData);

module.exports = router; 