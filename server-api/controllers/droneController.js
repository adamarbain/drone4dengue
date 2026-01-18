const prisma = require('../prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadImage, deleteImage: deleteFirebaseImage, generateStoragePath } = require('../utils/firebase_storage_utils');
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalError
} = require('../utils/errorResponse');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/drones';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Extended timeout for image processing operations
const EXTENDED_TIMEOUT = 10 * 60 * 1000; // 10 minutes for object detection
const STANDARD_TIMEOUT = 30 * 1000; // 30 seconds for regular operations

// Get company locations
exports.getCompanyLocations = async (req, res) => {
  try {
    const companyId = req.companyId;

    const locations = await prisma.companyLocation.findMany({
      where: { 
        companyId,
        isActive: true 
      },
      orderBy: { name: 'asc' }
    });

    res.json(locations);
  } catch (err) {
    logger.error('[GET COMPANY LOCATIONS ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to fetch company locations', err);
  }
};

// Create new company location
exports.createCompanyLocation = async (req, res) => {
  try {
    const { name, address, latitude, longitude } = req.body;
    const companyId = req.companyId;

    if (!name || !latitude || !longitude) {
      return sendValidationError(res, ['Name, latitude, and longitude are required']);
    }

    // Check if location with same name already exists for this company
    const existingLocation = await prisma.companyLocation.findFirst({
      where: {
        name: name,
        companyId: companyId
      }
    });

    if (existingLocation) {
      return sendConflictError(res, 'Location with this name already exists');
    }

    const location = await prisma.companyLocation.create({
      data: {
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        companyId
      }
    });

    res.status(201).json({
      message: 'Location created successfully',
      location
    });
  } catch (err) {
    logger.error('[CREATE COMPANY LOCATION ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to create location', err);
  }
};

// Get all drones for a company
exports.getAllDrones = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      companyId: req.companyId
    };

    if (search) {
      where.OR = [
        { droneId: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { operationalArea: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [drones, total] = await Promise.all([
      prisma.drone.findMany({
        where,
        include: {
          images: {
            select: {
              id: true,
              url: true,
              filename: true,
              sourceType: true,
              createdAt: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  code: true
                }
              },
              companyLocation: {
                select: {
                  id: true,
                  name: true,
                  address: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 3 // Get latest 3 images
          },
          user: {
            select: {
              userId: true,
              name: true
            }
          },
          companyLocation: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.drone.count({ where })
    ]);

    res.json({
      drones,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('[GET ALL DRONES ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to fetch drones', err);
  }
};

// Get drone statistics
exports.getDroneStats = async (req, res) => {
  try {
    const companyId = req.companyId;

    // Calculate this week date range
    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setHours(23, 59, 59, 999);

    const [
      totalDrones,
      operationalDrones,
      maintenanceDrones,
      inactiveDrones,
      totalImages,
      uploadedImages,
      videoFrameImages,
      thisWeekImages
    ] = await Promise.all([
      prisma.drone.count({ where: { companyId } }),
      prisma.drone.count({ where: { companyId, status: 'Operational' } }),
      prisma.drone.count({ where: { companyId, status: 'Maintenance' } }),
      prisma.drone.count({ where: { companyId, status: 'Inactive' } }),
      prisma.image.count({ 
        where: { 
          companyId 
        } 
      }),
      prisma.image.count({ 
        where: { 
          companyId,
          sourceType: 'upload'
        } 
      }),
      prisma.image.count({ 
        where: { 
          companyId,
          sourceType: 'video_frame'
        } 
      }),
      prisma.image.count({
        where: {
          companyId,
          createdAt: {
            gte: thisWeekStart,
            lte: thisWeekEnd
          }
        }
      })
    ]);

    res.json({
      totalDrones,
      operationalDrones,
      maintenanceDrones,
      inactiveDrones,
      totalImages,
      uploadedImages,
      videoFrameImages,
      thisWeekImages,
      coverageAreas: await prisma.drone.groupBy({
        by: ['operationalArea'],
        where: { companyId },
        _count: { operationalArea: true }
      }).then(areas => areas.length)
    });
  } catch (err) {
    logger.error('[GET DRONE STATS ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to fetch drone statistics', err);
  }
};

// Get single drone by ID
exports.getDroneById = async (req, res) => {
  try {
    const { id } = req.params;

    const drone = await prisma.drone.findFirst({
      where: {
        id: id,
        companyId: req.companyId
      },
      include: {
        images: {
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            userId: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!drone) {
      return sendNotFoundError(res, 'Drone');
    }

    res.json(drone);
  } catch (err) {
    logger.error('[GET DRONE BY ID ERROR]', { error: err.message, stack: err.stack, droneId: req.params.id });
    return sendInternalError(res, 'Failed to fetch drone', err);
  }
};

// Register new drone
exports.registerDrone = async (req, res) => {
  try {
    const { name, model, serial, operationalArea, status = 'Operational', companyLocationId } = req.body;
    
    if (!name || !model || !serial) {
      return sendValidationError(res, ['Name, model, and serial are required']);
    }

    const normalizedArea = operationalArea && operationalArea.trim() ? operationalArea : 'Unspecified';

    // Check if serial already exists
    const existingDrone = await prisma.drone.findUnique({ 
      where: { serial } 
    });
    
    if (existingDrone) {
      return sendConflictError(res, 'Drone with this serial already exists');
    }

    // Create new drone
    const drone = await prisma.drone.create({
      data: {
        name,
        model,
        serial,
        operationalArea: normalizedArea,
        status,
        userId: req.user.userId,
        companyId: req.companyId,
        companyLocationId: companyLocationId || null
      },
      include: {
        user: {
          select: {
            userId: true,
            name: true
          }
        },
        companyLocation: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    // Send notification to admin users
    try {
      const { notifyDroneChange } = require('../services/notificationService');
      await notifyDroneChange(drone, 'created');
    } catch (notifError) {
      logger.error('Failed to send drone notification', { error: notifError.message });
      // Don't fail the request if notification fails
    }

    res.status(201).json({ 
      message: 'Drone registered successfully',
      drone 
    });
  } catch (err) {
    logger.error('[DRONE REGISTER ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to register drone', err);
  }
};

// Update drone
exports.updateDrone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, serial, operationalArea, status, companyLocationId } = req.body;

    // Check if drone exists and belongs to company
    const existingDrone = await prisma.drone.findFirst({
      where: {
        id: id,
        companyId: req.companyId
      }
    });

    if (!existingDrone) {
      return sendNotFoundError(res, 'Drone');
    }

    // Update drone
    const updatedDrone = await prisma.drone.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(model && { model }),
        ...(serial && { serial }),
        ...(operationalArea && { operationalArea }),
        ...(status && { status }),
        ...(companyLocationId && { companyLocationId })
      },
      include: {
        user: {
          select: {
            userId: true,
            name: true
          }
        },
        companyLocation: true
      }
    });

    // Send notification to admin users
    try {
      const { notifyDroneChange } = require('../services/notificationService');
      await notifyDroneChange(updatedDrone, 'updated');
    } catch (notifError) {
      logger.error('Failed to send drone notification', { error: notifError.message });
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Drone updated successfully',
      drone: updatedDrone
    });
  } catch (err) {
    logger.error('[UPDATE DRONE ERROR]', { error: err.message, stack: err.stack, droneId: req.params.id });
    return sendInternalError(res, 'Failed to update drone', err);
  }
};

// Delete drone
exports.deleteDrone = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if drone exists and belongs to company
    const existingDrone = await prisma.drone.findFirst({
      where: {
        id: id,
        companyId: req.companyId
      }
    });

    if (!existingDrone) {
      return sendNotFoundError(res, 'Drone');
    }

    // Delete associated images from Firebase Storage
    const images = await prisma.image.findMany({ where: { droneId: id } });

    // Delete files from Firebase Storage
    for (const image of images) {
      if (image.url && (image.url.includes('storage.googleapis.com') || image.url.includes('firebasestorage.googleapis.com'))) {
        try {
          const { extractFilePathFromUrl } = require('../utils/firebase_storage_utils');
          const filePath = extractFilePathFromUrl(image.url);
          if (filePath) {
            await deleteFirebaseImage(filePath);
          }
        } catch (error) {
          logger.error('Error deleting image from Firebase', { error: error.message, imageId });
          // Continue with other images
        }
      } else {
        // Fallback: Delete local file if it's still using local storage
        const filePath = path.join('uploads/drones', path.basename(image.url));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Delete drone (cascade will delete images)
    await prisma.drone.delete({
      where: { id }
    });

    res.json({ message: 'Drone deleted successfully' });
  } catch (err) {
    logger.error('[DELETE DRONE ERROR]', { error: err.message, stack: err.stack, droneId: req.params.id });
    return sendInternalError(res, 'Failed to delete drone', err);
  }
};

// Upload drone images
exports.uploadImages = async (req, res) => {
  // Set extended timeout for image processing
  req.setTimeout(EXTENDED_TIMEOUT);
  res.setTimeout(EXTENDED_TIMEOUT);
  
  try {
    const { droneId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return sendValidationError(res, ['No files uploaded']);
    }

    // Check if drone exists and belongs to company
    const drone = await prisma.drone.findFirst({
      where: {
        id: droneId,
        companyId: req.companyId
      }
    });

    if (!drone) {
      return sendNotFoundError(res, 'Drone');
    }

    const uploadedFiles = [];

    for (const file of files) {
      try {
        // Generate Firebase Storage path
        const storagePath = generateStoragePath(file.originalname, 'drone-images');
        
        // Upload to Firebase Storage
        const firebaseUrl = await uploadImage(file.path, storagePath, {
          contentType: file.mimetype,
          customMetadata: {
            originalName: file.originalname,
            droneId: droneId,
            uploadedBy: req.user?.userId || 'system',
          },
        });

        // Clean up temporary local file after successful upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        // Store Firebase URL in database
        const fileData = {
          url: firebaseUrl, // Store Firebase URL instead of local path
          filename: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          sourceType: 'upload',
          droneId: droneId,
          companyId: req.companyId,
          companyLocationId: drone.companyLocationId || null
        };

        const image = await prisma.image.create({
          data: fileData
        });
        
        uploadedFiles.push({ type: 'image', ...image });
        console.log(`Image uploaded to Firebase: ${firebaseUrl}`);
      } catch (fileError) {
        logger.error('Error uploading file', { error: fileError.message, filename: file.originalname });
        // Clean up local file even on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      return sendErrorResponse(res, 500, 'Failed to upload any images', 'UPLOAD_FAILED');
    }

    // Send notification to admin users
    try {
      const { notifyDroneImagesUploaded } = require('../services/notificationService');
      await notifyDroneImagesUploaded(uploadedFiles, drone);
    } catch (notifError) {
      logger.error('Failed to send drone image notification', { error: notifError.message });
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Images uploaded successfully to Firebase',
      files: uploadedFiles
    });
  } catch (err) {
    logger.error('[UPLOAD IMAGES ERROR]', { error: err.message, stack: err.stack, droneId: req.params.id });
    return sendInternalError(res, 'Failed to upload images', err);
  }
};

// Upload video frames (bulk image upload from frontend video processing)
exports.uploadVideoFrames = async (req, res) => {
  // Set extended timeout for video frame processing
  req.setTimeout(EXTENDED_TIMEOUT);
  res.setTimeout(EXTENDED_TIMEOUT);
  
  try {
    const { droneId } = req.params;
    const { frames } = req.body; // Array of base64 images

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return sendValidationError(res, ['No frames provided']);
    }

    // Check if drone exists and belongs to company
    const drone = await prisma.drone.findFirst({
      where: {
        id: droneId,
        companyId: req.companyId
      }
    });

    if (!drone) {
      return sendNotFoundError(res, 'Drone');
    }

    const uploadedFrames = [];

    for (let i = 0; i < frames.length; i++) {
      try {
        const frame = frames[i];
        const base64Data = frame.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const filename = `frame-${Date.now()}-${i}-${Math.round(Math.random() * 1E9)}.jpg`;
        
        // Generate Firebase Storage path
        const storagePath = generateStoragePath(filename, 'video-frames');
        
        // Upload directly to Firebase Storage (using buffer, no temporary file needed)
        const firebaseUrl = await uploadImage(buffer, storagePath, {
          contentType: 'image/jpeg',
          customMetadata: {
            originalName: filename,
            droneId: droneId,
            frameIndex: i.toString(),
            uploadedBy: req.user?.userId || 'system',
          },
        });

        const fileData = {
          url: firebaseUrl, // Store Firebase URL instead of local path
          filename: filename,
          fileSize: buffer.length,
          mimeType: 'image/jpeg',
          sourceType: 'video_frame',
          droneId: droneId,
          companyId: req.companyId,
          companyLocationId: drone.companyLocationId || null
        };

        const image = await prisma.image.create({
          data: fileData
        });
        
        uploadedFrames.push({ type: 'image', ...image });
        console.log(`Video frame ${i + 1}/${frames.length} uploaded to Firebase: ${firebaseUrl}`);
      } catch (frameError) {
        logger.error('Error uploading frame', { error: frameError.message, frameIndex: i });
        // Continue with other frames
      }
    }

    if (uploadedFrames.length === 0) {
      return sendErrorResponse(res, 500, 'Failed to upload any video frames', 'UPLOAD_FAILED');
    }

    // Send notification to admin users
    try {
      const { notifyDroneImagesUploaded } = require('../services/notificationService');
      await notifyDroneImagesUploaded(uploadedFrames, drone);
    } catch (notifError) {
      logger.error('Failed to send drone image notification', { error: notifError.message });
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Video frames uploaded successfully to Firebase',
      frames: uploadedFrames,
      count: uploadedFrames.length
    });
  } catch (err) {
    logger.error('[UPLOAD VIDEO FRAMES ERROR]', { error: err.message, stack: err.stack, droneId: req.params.id });
    return sendInternalError(res, 'Failed to upload video frames', err);
  }
};

// Get drone images
exports.getDroneImages = async (req, res) => {
  try {
    const { droneId } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    // Check if drone exists and belongs to company
    const drone = await prisma.drone.findFirst({
      where: {
        id: droneId,
        companyId: req.companyId
      }
    });

    if (!drone) {
      return sendNotFoundError(res, 'Drone');
    }

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where: { droneId },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          companyLocation: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.image.count({ where: { droneId } })
    ]);

    res.json({
      images,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('[GET DRONE IMAGES ERROR]', { error: err.message, stack: err.stack, droneId: req.params.id });
    return sendInternalError(res, 'Failed to fetch images', err);
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.image.findFirst({
      where: { id: imageId },
      include: {
        drone: {
          select: { companyId: true }
        }
      }
    });

    if (!image || image.drone.companyId !== req.companyId) {
      return sendNotFoundError(res, 'Image');
    }

    // Delete from Firebase Storage if URL is a Firebase URL
    if (image.url && (image.url.includes('storage.googleapis.com') || image.url.includes('firebasestorage.googleapis.com'))) {
      try {
        const { extractFilePathFromUrl } = require('../utils/firebase_storage_utils');
        const filePath = extractFilePathFromUrl(image.url);
        if (filePath) {
          await deleteFirebaseImage(filePath);
          console.log(`Image deleted from Firebase: ${filePath}`);
        }
      } catch (firebaseError) {
        logger.error('Error deleting from Firebase (continuing with DB delete)', { error: firebaseError.message });
        // Continue with database deletion even if Firebase delete fails
      }
    } else {
      // Fallback: Delete local file if it's still using local storage
      const filePath = path.join('uploads/drones', path.basename(image.url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Local file deleted: ${filePath}`);
      }
    }

    // Delete from database
    await prisma.image.delete({
      where: { id: imageId }
    });

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    logger.error('[DELETE IMAGE ERROR]', { error: err.message, stack: err.stack, imageId: req.params.id });
    return sendInternalError(res, 'Failed to delete image', err);
  }
};

// Download image
exports.downloadImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.image.findFirst({
      where: { id: imageId },
      include: {
        drone: {
          select: { companyId: true }
        }
      }
    });

    if (!image || image.drone.companyId !== req.companyId) {
      return sendNotFoundError(res, 'Image');
    }

    // If it's a Firebase URL, redirect to Firebase or download via proxy
    if (image.url && (image.url.includes('storage.googleapis.com') || image.url.includes('firebasestorage.googleapis.com'))) {
      // Redirect to Firebase URL (or proxy the download)
      return res.redirect(image.url);
    }

    // Fallback: Local file download (for backward compatibility)
    const filePath = path.join('uploads/drones', path.basename(image.url));
    
    if (!fs.existsSync(filePath)) {
      return sendNotFoundError(res, 'File');
    }

    res.download(filePath, image.filename);
  } catch (err) {
    logger.error('[DOWNLOAD IMAGE ERROR]', { error: err.message, stack: err.stack, imageId: req.params.id });
    return sendInternalError(res, 'Failed to download image', err);
  }
};

// Get recent drone images for dashboard
exports.getRecentDroneImages = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { limit = 6 } = req.query;

    const images = await prisma.image.findMany({
      where: { 
        companyId 
      },
      include: {
        drone: {
          select: {
            id: true,
            name: true,
            droneId: true,
            operationalArea: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        companyLocation: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      images,
      count: images.length
    });
  } catch (err) {
    logger.error('[GET RECENT DRONE IMAGES ERROR]', { error: err.message, stack: err.stack, companyId: req.companyId });
    return sendInternalError(res, 'Failed to fetch recent drone images', err);
  }
};

// Get images for a specific company location
exports.getLocationImages = async (req, res) => {
  // Set extended timeout for image retrieval
  req.setTimeout(EXTENDED_TIMEOUT);
  res.setTimeout(EXTENDED_TIMEOUT);
  
  try {
    const { companyLocationId } = req.params;
    const companyId = req.companyId;

    // Verify the location belongs to the company
    const location = await prisma.companyLocation.findFirst({
      where: {
        id: companyLocationId,
        companyId: companyId
      }
    });
    
    if (!location) {
      return sendNotFoundError(res, 'Location');
    }

    const images = await prisma.image.findMany({
      where: {
        companyId: companyId,
        companyLocationId: companyLocationId
      },
      include: {
        drone: {
          select: {
            id: true,
            name: true,
            droneId: true,
            operationalArea: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        companyLocation: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      images: images
    });
  } catch (err) {
    logger.error('[GET LOCATION IMAGES ERROR]', { error: err.message, stack: err.stack, locationId: req.params.locationId });
    return sendInternalError(res, 'Failed to fetch location images', err);
  }
};

// Export multer upload middleware
exports.uploadMiddleware = upload.array('images', 10); // Allow up to 10 image files 