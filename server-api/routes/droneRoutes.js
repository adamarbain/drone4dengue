const express = require('express');
const multer = require('multer');
const router = express.Router();
const { checkToken, checkRole } = require('../middleware/authMiddleware');
const {
  getAllDrones,
  getDroneStats,
  getDroneById,
  registerDrone,
  updateDrone,
  deleteDrone,
  uploadImages,
  uploadVideoFrames,
  getDroneImages,
  deleteImage,
  downloadImage,
  uploadMiddleware,
  getCompanyLocations,
  createCompanyLocation,
  getRecentDroneImages,
  getLocationImages
} = require('../controllers/droneController');

// Middleware for error handling
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
  }
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

// Company location routes
router.get('/locations', checkToken, checkRole('admin'), getCompanyLocations);
router.post('/locations', checkToken, checkRole('admin'), createCompanyLocation);

// Recent images route for dashboard
router.get('/recent-images', checkToken, checkRole('admin'), getRecentDroneImages);

// Get images for a specific company location
router.get('/locations/:companyLocationId/images', checkToken, checkRole('admin'), getLocationImages);

// Drone CRUD routes
router.get('/', checkToken, checkRole('admin'), getAllDrones);
router.get('/stats', checkToken, checkRole('admin'), getDroneStats);
router.get('/:id', checkToken, checkRole('admin'), getDroneById);
router.post('/register', checkToken, checkRole('admin'), registerDrone);
router.put('/:id', checkToken, checkRole('admin'), updateDrone);
router.delete('/:id', checkToken, checkRole('admin'), deleteDrone);

// Media management routes
router.post('/:droneId/upload-images', 
  checkToken, 
  checkRole('admin'), 
  uploadMiddleware, 
  handleUploadError, 
  uploadImages
);

router.post('/:droneId/upload-frames', 
  checkToken, 
  checkRole('admin'), 
  uploadVideoFrames
);

router.get('/:droneId/images', checkToken, checkRole('admin'), getDroneImages);
router.delete('/images/:imageId', checkToken, checkRole('admin'), deleteImage);
router.get('/images/:imageId/download', checkToken, checkRole('admin'), downloadImage);

module.exports = router; 