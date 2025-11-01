/**
 * Firebase Storage Utility Module
 * 
 * Handles upload and download operations for drone images using Firebase Storage.
 * This module replaces local filesystem storage with cloud storage.
 * 
 * @module firebase_storage_utils
 */

const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK if not already initialized
let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK with service account credentials
 * 
 * @returns {Promise<boolean>} True if initialization successful
 */
function initializeFirebase() {
  if (firebaseInitialized) {
    return Promise.resolve(true);
  }

  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length > 0) {
      firebaseInitialized = true;
      return Promise.resolve(true);
    }

    // Get Firebase configuration from environment variables
    const firebaseConfig = {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    };

    // Initialize Firebase Admin
    admin.initializeApp(firebaseConfig);
    firebaseInitialized = true;

    console.log('Firebase Admin SDK initialized successfully');
    return Promise.resolve(true);
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw new Error(`Failed to initialize Firebase: ${error.message}`);
  }
}

/**
 * Upload an image file to Firebase Storage
 * 
 * @param {string|Buffer} fileData - Local file path or Buffer containing image data
 * @param {string} destinationPath - Destination path in Firebase Storage (e.g., 'drone-images/filename.jpg')
 * @param {Object} metadata - Optional metadata for the file (contentType, customMetadata, etc.)
 * @returns {Promise<string>} Public download URL of the uploaded file
 * 
 * @example
 * const url = await uploadImage('/tmp/image.jpg', 'drone-images/abc123.jpg');
 * // Returns: 'https://firebasestorage.googleapis.com/...'
 */
async function uploadImage(fileData, destinationPath, metadata = {}) {
  try {
    await initializeFirebase();

    const bucket = getStorage().bucket();
    const file = bucket.file(destinationPath);

    // Determine if fileData is a path or buffer
    let buffer;
    if (typeof fileData === 'string') {
      // It's a file path
      if (!fs.existsSync(fileData)) {
        throw new Error(`File not found: ${fileData}`);
      }
      buffer = fs.readFileSync(fileData);
    } else if (Buffer.isBuffer(fileData)) {
      // It's already a buffer
      buffer = fileData;
    } else {
      throw new Error('fileData must be a file path (string) or Buffer');
    }

    // Set default metadata
    const fileMetadata = {
      contentType: metadata.contentType || 'image/jpeg',
      metadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata.customMetadata,
      },
    };

    // Upload file to Firebase Storage
    await file.save(buffer, {
      metadata: fileMetadata,
      public: true, // Make file publicly accessible
    });

    // Make file publicly accessible (if not already)
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
    
    // Alternative: Get signed URL (works for private files too)
    // const [signedUrl] = await file.getSignedUrl({
    //   action: 'read',
    //   expires: '03-09-2491', // Far future date for permanent access
    // });

    console.log(`Image uploaded successfully to: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Firebase upload error:', error);
    throw new Error(`Failed to upload image to Firebase: ${error.message}`);
  }
}

/**
 * Download an image from Firebase Storage URL
 * 
 * @param {string} url - Firebase Storage public URL or download URL
 * @returns {Promise<Buffer>} Image data as Buffer
 * 
 * @example
 * const imageBuffer = await downloadImage('https://storage.googleapis.com/...');
 */
async function downloadImage(url) {
  try {
    await initializeFirebase();

    const bucket = getStorage().bucket();
    
    // Extract file path from URL
    // URLs can be in format: https://storage.googleapis.com/BUCKET_NAME/path/to/file.jpg
    // or: https://firebasestorage.googleapis.com/v0/b/BUCKET_NAME/o/path%2Fto%2Ffile.jpg?alt=media
    let filePath;
    
    if (url.includes('storage.googleapis.com')) {
      // Direct storage URL
      const urlParts = url.replace('https://storage.googleapis.com/', '').split('/');
      const bucketName = urlParts[0];
      filePath = urlParts.slice(1).join('/');
      
      if (bucketName !== bucket.name) {
        console.warn(`Bucket name mismatch: expected ${bucket.name}, got ${bucketName}`);
      }
    } else if (url.includes('firebasestorage.googleapis.com')) {
      // Firebase download URL - extract path from URL
      const match = url.match(/\/o\/(.+?)\?/);
      if (match) {
        filePath = decodeURIComponent(match[1]);
      } else {
        throw new Error('Could not extract file path from Firebase URL');
      }
    } else {
      // Try to use URL as-is (might be relative path stored in DB)
      filePath = url.replace(/^\//, ''); // Remove leading slash
    }

    const file = bucket.file(filePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found in Firebase Storage: ${filePath}`);
    }

    // Download file as buffer
    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    console.error('Firebase download error:', error);
    throw new Error(`Failed to download image from Firebase: ${error.message}`);
  }
}

/**
 * Delete an image from Firebase Storage
 * 
 * @param {string} destinationPath - Path to file in Firebase Storage
 * @returns {Promise<boolean>} True if deletion successful
 */
async function deleteImage(destinationPath) {
  try {
    await initializeFirebase();

    const bucket = getStorage().bucket();
    const file = bucket.file(destinationPath);

    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`File not found in Firebase Storage: ${destinationPath}`);
      return false;
    }

    await file.delete();
    console.log(`Image deleted successfully: ${destinationPath}`);
    return true;
  } catch (error) {
    console.error('Firebase delete error:', error);
    throw new Error(`Failed to delete image from Firebase: ${error.message}`);
  }
}

/**
 * Extract file path from Firebase Storage URL
 * 
 * @param {string} url - Firebase Storage URL
 * @returns {string} File path in storage bucket
 */
function extractFilePathFromUrl(url) {
  if (!url) return null;
  
  if (url.includes('storage.googleapis.com')) {
    const parts = url.replace('https://storage.googleapis.com/', '').split('/');
    return parts.slice(1).join('/');
  } else if (url.includes('firebasestorage.googleapis.com')) {
    const match = url.match(/\/o\/(.+?)\?/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  
  return url.replace(/^\//, '');
}

/**
 * Generate a unique destination path for an image
 * 
 * @param {string} filename - Original filename
 * @param {string} prefix - Optional prefix (e.g., 'drone-images', 'video-frames')
 * @returns {string} Unique path in format: prefix/YYYY/MM/unique-filename.ext
 */
function generateStoragePath(filename, prefix = 'drone-images') {
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const uniqueName = `${baseName}-${timestamp}-${random}${ext}`;
  
  // Organize by date (optional, for better organization)
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  return `${prefix}/${year}/${month}/${uniqueName}`;
}

module.exports = {
  initializeFirebase,
  uploadImage,
  downloadImage,
  deleteImage,
  extractFilePathFromUrl,
  generateStoragePath,
};

