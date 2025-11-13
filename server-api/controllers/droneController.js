const prisma = require('../prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadImage, deleteImage: deleteFirebaseImage, generateStoragePath } = require('../utils/firebase_storage_utils');

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
    console.error('[GET COMPANY LOCATIONS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch company locations' });
  }
};

// Create new company location
exports.createCompanyLocation = async (req, res) => {
  try {
    const { name, address, latitude, longitude } = req.body;
    const companyId = req.companyId;

    if (!name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
    }

    // Check if location with same name already exists for this company
    const existingLocation = await prisma.companyLocation.findFirst({
      where: {
        name: name,
        companyId: companyId
      }
    });

    if (existingLocation) {
      return res.status(409).json({ error: 'Location with this name already exists' });
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
    console.error('[CREATE COMPANY LOCATION ERROR]', err);
    res.status(500).json({ error: 'Failed to create location' });
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
    console.error('[GET ALL DRONES ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch drones' });
  }
};

// Get drone statistics
exports.getDroneStats = async (req, res) => {
  try {
    const companyId = req.companyId;

    const [
      totalDrones,
      operationalDrones,
      maintenanceDrones,
      inactiveDrones,
      totalImages,
      uploadedImages,
      videoFrameImages
    ] = await Promise.all([
      prisma.drone.count({ where: { companyId } }),
      prisma.drone.count({ where: { companyId, status: 'Operational' } }),
      prisma.drone.count({ where: { companyId, status: 'Maintenance' } }),
      prisma.drone.count({ where: { companyId, status: 'Inactive' } }),
      prisma.image.count({ 
        where: { 
          drone: { companyId } 
        } 
      }),
      prisma.image.count({ 
        where: { 
          drone: { companyId },
          sourceType: 'upload'
        } 
      }),
      prisma.image.count({ 
        where: { 
          drone: { companyId },
          sourceType: 'video_frame'
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
      coverageAreas: await prisma.drone.groupBy({
        by: ['operationalArea'],
        where: { companyId },
        _count: { operationalArea: true }
      }).then(areas => areas.length)
    });
  } catch (err) {
    console.error('[GET DRONE STATS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch drone statistics' });
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
      return res.status(404).json({ error: 'Drone not found' });
    }

    res.json(drone);
  } catch (err) {
    console.error('[GET DRONE BY ID ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch drone' });
  }
};

// Register new drone
exports.registerDrone = async (req, res) => {
  try {
    const { name, model, serial, operationalArea, status = 'Operational', companyLocationId } = req.body;
    
    if (!name || !model || !serial || !operationalArea) {
      return res.status(400).json({ error: 'Name, model, serial, and operational area are required' });
    }

    // Check if serial already exists
    const existingDrone = await prisma.drone.findUnique({ 
      where: { serial } 
    });
    
    if (existingDrone) {
      return res.status(409).json({ error: 'Drone with this serial already exists' });
    }

    // Create new drone
    const drone = await prisma.drone.create({
      data: {
        name,
        model,
        serial,
        operationalArea,
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
      console.error('Failed to send drone notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({ 
      message: 'Drone registered successfully',
      drone 
    });
  } catch (err) {
    console.error('[DRONE REGISTER ERROR]', err);
    res.status(500).json({ error: 'Failed to register drone' });
  }
};

// Update drone
exports.updateDrone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, operationalArea, status } = req.body;

    // Check if drone exists and belongs to company
    const existingDrone = await prisma.drone.findFirst({
      where: {
        id: id,
        companyId: req.companyId
      }
    });

    if (!existingDrone) {
      return res.status(404).json({ error: 'Drone not found' });
    }

    // Update drone
    const updatedDrone = await prisma.drone.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(model && { model }),
        ...(operationalArea && { operationalArea }),
        ...(status && { status })
      },
      include: {
        user: {
          select: {
            userId: true,
            name: true
          }
        }
      }
    });

    // Send notification to admin users
    try {
      const { notifyDroneChange } = require('../services/notificationService');
      await notifyDroneChange(updatedDrone, 'updated');
    } catch (notifError) {
      console.error('Failed to send drone notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Drone updated successfully',
      drone: updatedDrone
    });
  } catch (err) {
    console.error('[UPDATE DRONE ERROR]', err);
    res.status(500).json({ error: 'Failed to update drone' });
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
      return res.status(404).json({ error: 'Drone not found' });
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
          console.error(`Error deleting image from Firebase: ${error.message}`);
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
    console.error('[DELETE DRONE ERROR]', err);
    res.status(500).json({ error: 'Failed to delete drone' });
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
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Check if drone exists and belongs to company
    const drone = await prisma.drone.findFirst({
      where: {
        id: droneId,
        companyId: req.companyId
      }
    });

    if (!drone) {
      return res.status(404).json({ error: 'Drone not found' });
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
        console.error(`Error uploading file ${file.originalname}:`, fileError);
        // Clean up local file even on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({ error: 'Failed to upload any images' });
    }

    // Send notification to admin users
    try {
      const { notifyDroneImagesUploaded } = require('../services/notificationService');
      await notifyDroneImagesUploaded(uploadedFiles, drone);
    } catch (notifError) {
      console.error('Failed to send drone image notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Images uploaded successfully to Firebase',
      files: uploadedFiles
    });
  } catch (err) {
    console.error('[UPLOAD IMAGES ERROR]', err);
    res.status(500).json({ error: 'Failed to upload images: ' + err.message });
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
      return res.status(400).json({ error: 'No frames provided' });
    }

    // Check if drone exists and belongs to company
    const drone = await prisma.drone.findFirst({
      where: {
        id: droneId,
        companyId: req.companyId
      }
    });

    if (!drone) {
      return res.status(404).json({ error: 'Drone not found' });
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
        console.error(`Error uploading frame ${i}:`, frameError);
        // Continue with other frames
      }
    }

    if (uploadedFrames.length === 0) {
      return res.status(500).json({ error: 'Failed to upload any video frames' });
    }

    // Send notification to admin users
    try {
      const { notifyDroneImagesUploaded } = require('../services/notificationService');
      await notifyDroneImagesUploaded(uploadedFrames, drone);
    } catch (notifError) {
      console.error('Failed to send drone image notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Video frames uploaded successfully to Firebase',
      frames: uploadedFrames,
      count: uploadedFrames.length
    });
  } catch (err) {
    console.error('[UPLOAD VIDEO FRAMES ERROR]', err);
    res.status(500).json({ error: 'Failed to upload video frames: ' + err.message });
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
      return res.status(404).json({ error: 'Drone not found' });
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
    console.error('[GET DRONE IMAGES ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch images' });
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
      return res.status(404).json({ error: 'Image not found' });
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
        console.error('Error deleting from Firebase (continuing with DB delete):', firebaseError);
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
    console.error('[DELETE IMAGE ERROR]', err);
    res.status(500).json({ error: 'Failed to delete image: ' + err.message });
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
      return res.status(404).json({ error: 'Image not found' });
    }

    // If it's a Firebase URL, redirect to Firebase or download via proxy
    if (image.url && (image.url.includes('storage.googleapis.com') || image.url.includes('firebasestorage.googleapis.com'))) {
      // Redirect to Firebase URL (or proxy the download)
      return res.redirect(image.url);
    }

    // Fallback: Local file download (for backward compatibility)
    const filePath = path.join('uploads/drones', path.basename(image.url));
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(filePath, image.filename);
  } catch (err) {
    console.error('[DOWNLOAD IMAGE ERROR]', err);
    res.status(500).json({ error: 'Failed to download image' });
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
    console.error('[GET RECENT DRONE IMAGES ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch recent drone images' });
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
      return res.status(404).json({ error: 'Location not found' });
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
    console.error('[GET LOCATION IMAGES ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch location images' });
  }
};

// Export multer upload middleware
exports.uploadMiddleware = upload.array('images', 10); // Allow up to 10 image files 