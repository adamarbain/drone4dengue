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
const crypto = require('crypto');

/**
 * Normalize a PEM private key string so OpenSSL can decode it reliably.
 * Handles different newline encodings and optional base64-encoded payloads.
 *
 * @param {string|undefined} rawKey
 * @returns {string|null}
 */
function normalizePrivateKey(rawKey) {
  if (!rawKey) {
    return null;
  }

  // Handle non-string types
  if (typeof rawKey !== 'string') {
    console.warn('[firebase_storage_utils] Private key is not a string, attempting to convert...');
    rawKey = String(rawKey);
  }

  let normalized = rawKey.trim();

  // Return null if key is empty after trimming
  if (normalized.length === 0) {
    return null;
  }

  // If the key looks base64-encoded (no PEM header), try to decode it.
  const looksBase64 = !normalized.includes('BEGIN') && /^[A-Za-z0-9+/=]+$/.test(normalized);
  if (looksBase64) {
    try {
      normalized = Buffer.from(normalized, 'base64').toString('utf8').trim();
      // If decoding resulted in empty string, return null
      if (normalized.length === 0) {
        return null;
      }
    } catch (error) {
      throw new Error(`Failed to decode FIREBASE_PRIVATE_KEY_BASE64: ${error.message}`);
    }
  }

  // Normalize line endings - handle various formats
  normalized = normalized
    .replace(/\\n/g, '\n') // Support escaped new lines (e.g. Render, Vercel)
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n'); // Handle any remaining \r

  // Extract PEM header and footer
  const beginMatch = normalized.match(/-----BEGIN[^-]+-----/);
  const endMatch = normalized.match(/-----END[^-]+-----/);
  
  if (!beginMatch || !endMatch) {
    // If no proper PEM structure, try to find it without strict matching
    const looseBeginMatch = normalized.match(/BEGIN[^E]+KEY/);
    const looseEndMatch = normalized.match(/END[^E]+KEY/);
    
    if (looseBeginMatch && looseEndMatch) {
      console.warn('[firebase_storage_utils] Found PEM markers but format may be non-standard');
      // Try to extract and reformat anyway
      const beginIdx = normalized.indexOf(looseBeginMatch[0]) - 5; // Account for "-----"
      const endIdx = normalized.indexOf(looseEndMatch[0]) + looseEndMatch[0].length + 5;
      
      if (beginIdx >= 0 && endIdx > beginIdx) {
        const extracted = normalized.substring(beginIdx, endIdx);
        // Clean and return the extracted portion (don't recurse to avoid infinite loop)
        return extracted.trim();
      }
    }
    
    // If we can't find proper structure, return as-is (will be caught by validation)
    console.warn('[firebase_storage_utils] Could not find proper PEM BEGIN/END markers');
    return normalized.trim();
  }

  const beginLine = beginMatch[0];
  const endLine = endMatch[0];
  
  // Extract the base64 content between headers
  const contentStart = normalized.indexOf(beginLine) + beginLine.length;
  const contentEnd = normalized.indexOf(endLine);
  
  if (contentStart >= contentEnd) {
    console.warn('[firebase_storage_utils] Invalid PEM structure: content area is empty or malformed');
    return normalized.trim();
  }

  // Extract and clean the base64 content
  let keyContent = normalized.substring(contentStart, contentEnd)
    .replace(/\s/g, '') // Remove all whitespace
    .trim();

  // Validate base64 content
  if (!/^[A-Za-z0-9+/=]+$/.test(keyContent)) {
    console.warn('[firebase_storage_utils] Private key content does not appear to be valid base64');
    // Still try to return something - Firebase will validate
    return normalized.trim();
  }

  // Reformat the base64 content with proper line breaks (64 characters per line is standard)
  // This ensures the PEM format is correct
  const reformattedContent = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent;

  // Reconstruct the PEM key with proper formatting
  // Ensure there's a newline after BEGIN and before END
  let reformattedKey = `${beginLine}\n${reformattedContent}\n${endLine}`;
  
  // Ensure it ends with a newline
  if (!reformattedKey.endsWith('\n')) {
    reformattedKey += '\n';
  }

  return reformattedKey;
}

/**
 * Validate that a private key can be parsed by Node.js crypto
 * This helps catch format issues before passing to Firebase Admin SDK
 * 
 * @param {string} privateKey - PEM-formatted private key
 * @returns {boolean} True if key is valid
 */
function validatePrivateKeyFormat(privateKey) {
  if (!privateKey || typeof privateKey !== 'string') {
    return false;
  }

  try {
    // Try to create a private key object from the PEM string
    // This will throw if the format is invalid
    const keyObject = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem',
    });
    
    // If we get here, the key is valid
    return true;
  } catch (error) {
    // Key format is invalid
    console.warn('[firebase_storage_utils] Private key validation failed:', error.message);
    return false;
  }
}

/**
 * Resolve Firebase service account fields from environment variables.
 * Supports multiple formats to make production hosting easier.
 * 
 * Priority order:
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON (with fallback to individual vars if parsing fails)
 * 2. Individual environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, etc.)
 */
function resolveFirebaseCredentialFields() {
  // Check for multiple configuration methods and warn
  const hasServiceAccountJson = !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT);
  const hasIndividualVars = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && 
                              (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_BASE64));
  
  if (hasServiceAccountJson && hasIndividualVars) {
    console.warn(
      '[firebase_storage_utils] Both FIREBASE_SERVICE_ACCOUNT_JSON and individual Firebase env vars are set. ' +
      'FIREBASE_SERVICE_ACCOUNT_JSON will be used first. If it fails to parse, individual vars will be used as fallback. ' +
      'Consider using only ONE method to avoid confusion.'
    );
  }

  // 1. Full service account JSON (literal or base64) takes precedence if provided.
  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountJson) {
    let parsed;
    try {
      const maybeJsonString = serviceAccountJson.trim();
      let jsonString;
      
      // Log diagnostic info (without exposing sensitive data)
      const inputLength = maybeJsonString.length;
      const startsWithBrace = maybeJsonString.startsWith('{');
      const firstChars = maybeJsonString.substring(0, Math.min(50, maybeJsonString.length));
      console.log('[firebase_storage_utils] Parsing service account JSON:', {
        length: inputLength,
        startsWithBrace,
        firstChars: startsWithBrace ? firstChars : '[hidden - likely base64]',
        hasNewlines: maybeJsonString.includes('\n')
      });
      
      // Determine if the string is base64 encoded or raw JSON
      // Base64 strings typically don't start with '{' and contain only base64 characters
      const looksLikeBase64 = !maybeJsonString.startsWith('{') && 
                               !maybeJsonString.startsWith('[') &&
                               /^[A-Za-z0-9+/=\s]+$/.test(maybeJsonString.replace(/\s/g, ''));
      
      if (looksLikeBase64) {
        // Try to decode as base64
        try {
          const base64Clean = maybeJsonString.replace(/\s/g, '');
          const decoded = Buffer.from(base64Clean, 'base64');
          jsonString = decoded.toString('utf8');
          
          // Validate that decoded content looks like JSON
          const decodedTrimmed = jsonString.trim();
          if (!decodedTrimmed.startsWith('{') && !decodedTrimmed.startsWith('[')) {
            // Check if it's valid UTF-8
            const isValidUtf8 = Buffer.from(decodedTrimmed, 'utf8').toString('utf8') === decodedTrimmed;
            if (!isValidUtf8) {
              throw new Error('Decoded base64 contains invalid UTF-8 characters');
            }
            throw new Error('Decoded base64 does not appear to be valid JSON (does not start with { or [)');
          }
          
          console.log('[firebase_storage_utils] Successfully decoded base64 JSON, length:', decodedTrimmed.length);
        } catch (base64Error) {
          // If base64 decoding fails, try treating it as raw JSON
          console.warn('[firebase_storage_utils] Base64 decoding failed, trying as raw JSON:', base64Error.message);
          jsonString = maybeJsonString;
        }
      } else {
        // Treat as raw JSON
        jsonString = maybeJsonString;
      }
      
      // Validate JSON string before parsing
      const trimmedJson = jsonString.trim();
      if (!trimmedJson.startsWith('{') && !trimmedJson.startsWith('[')) {
        throw new Error(
          'Service account JSON must be a valid JSON object or array. ' +
          'If using base64 encoding, ensure it decodes to valid JSON.'
        );
      }
      
      // Check for invalid characters that might indicate encoding issues
      const hasInvalidChars = /[^\x20-\x7E\n\r\t]/.test(trimmedJson);
      if (hasInvalidChars && trimmedJson.length < 1000) {
        console.warn('[firebase_storage_utils] JSON contains non-printable characters, may indicate encoding issues');
        
        // Try to clean up common encoding issues
        // Remove null bytes and other control characters (except newlines/tabs)
        const cleaned = trimmedJson.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
        if (cleaned !== trimmedJson) {
          console.warn('[firebase_storage_utils] Attempting to parse cleaned JSON (removed control characters)');
          try {
            parsed = JSON.parse(cleaned);
            console.log('[firebase_storage_utils] Successfully parsed cleaned JSON');
          } catch (cleanError) {
            // If cleaned version also fails, try original
            console.warn('[firebase_storage_utils] Cleaned JSON also failed, trying original');
            parsed = JSON.parse(trimmedJson);
          }
        } else {
          parsed = JSON.parse(trimmedJson);
        }
      } else {
        parsed = JSON.parse(trimmedJson);
      }
    } catch (error) {
      // If JSON parsing fails and individual vars are available, log warning and fall through to use them
      if (hasIndividualVars) {
        console.warn(
          '[firebase_storage_utils] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, ' +
          'falling back to individual environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, etc.)'
        );
        // Set parsed to undefined to trigger fallback
        parsed = undefined;
      } else {
        // No fallback available, provide detailed error
        const diagnosticInfo = {
          inputLength: serviceAccountJson.length,
          startsWithBrace: serviceAccountJson.trim().startsWith('{'),
          looksLikeBase64: /^[A-Za-z0-9+/=\s]+$/.test(serviceAccountJson.replace(/\s/g, '')),
          hasInvalidChars: /[^\x20-\x7E\n\r\t]/.test(serviceAccountJson)
        };
        
        console.error('[firebase_storage_utils] JSON parsing failed. Diagnostic info:', diagnosticInfo);
        
        let troubleshooting = 'Troubleshooting steps:\n';
        troubleshooting += '1. Verify FIREBASE_SERVICE_ACCOUNT_JSON contains valid JSON or base64-encoded JSON\n';
        troubleshooting += '2. If using base64, ensure it was encoded correctly: echo "$JSON" | base64 -w0\n';
        troubleshooting += '3. Check that the environment variable is not truncated or corrupted\n';
        troubleshooting += '4. On Render, ensure the environment variable is set as "Secret" type\n';
        troubleshooting += '5. Try using individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) instead\n';
        
        throw new Error(
          `Failed to parse Firebase service account JSON: ${error.message}\n\n` +
          `${troubleshooting}\n` +
          `Input info: length=${diagnosticInfo.inputLength}, ` +
          `starts with {{=${diagnosticInfo.startsWithBrace}, ` +
          `looks like base64=${diagnosticInfo.looksLikeBase64}, ` +
          `has invalid chars=${diagnosticInfo.hasInvalidChars}`
        );
      }
    }

    // If parsing succeeded, use the parsed JSON
    if (typeof parsed !== 'undefined' && parsed !== null) {
      // Validate required fields in service account JSON
      if (!parsed.private_key) {
        throw new Error(
          'FIREBASE_SERVICE_ACCOUNT_JSON is missing the "private_key" field. ' +
          'Please ensure your service account JSON contains a valid private_key.'
        );
      }

      const normalizedKey = normalizePrivateKey(parsed.private_key);
      if (!normalizedKey) {
        throw new Error(
          'FIREBASE_SERVICE_ACCOUNT_JSON contains an invalid or empty "private_key" field. ' +
          'Please check that the private_key is properly formatted as a PEM key.'
        );
      }

      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: normalizedKey,
        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET ||
          parsed.storageBucket || // non-standard but allow override
          parsed.project_id ? `${parsed.project_id}.appspot.com` : undefined
      };
    }
    // If parsed is undefined, fall through to use individual vars below
  }

  // 2. Individual env vars (legacy/default path or fallback).
  const privateKey =
    normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY) ||
    normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY_BASE64);

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  };
}

/**
 * Validate Firebase configuration presence and throw descriptive errors to help operators.
 */
function getFirebaseConfigFromEnv() {
  const { projectId, clientEmail, privateKey, storageBucket } = resolveFirebaseCredentialFields();

  const missing = [];
  if (!projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) {
    // Provide more specific error message for missing private key
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT) {
      missing.push('FIREBASE_SERVICE_ACCOUNT_JSON (private_key field is missing or invalid)');
    } else {
      missing.push('FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_BASE64');
    }
  }
  if (!storageBucket) missing.push('FIREBASE_STORAGE_BUCKET');

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase configuration value(s): ${missing.join(', ')}. ` +
      'See docs/firebase-storage-migration.md for setup details.'
    );
  }

  // Additional validation: ensure privateKey is a non-empty string
  if (typeof privateKey !== 'string' || privateKey.trim().length === 0) {
    throw new Error(
      'Firebase private_key must be a non-empty string. ' +
      'Please check your FIREBASE_PRIVATE_KEY, FIREBASE_PRIVATE_KEY_BASE64, or FIREBASE_SERVICE_ACCOUNT_JSON configuration.'
    );
  }

  // The privateKey should already be normalized by normalizePrivateKey()
  // But let's ensure it's properly formatted for Firebase
  let formattedKey = privateKey;

  // Validate PEM structure - should have BEGIN and END markers
  const hasBegin = formattedKey.includes('BEGIN PRIVATE KEY') || 
                   formattedKey.includes('BEGIN RSA PRIVATE KEY') ||
                   formattedKey.includes('BEGIN EC PRIVATE KEY');
  const hasEnd = formattedKey.includes('END PRIVATE KEY') || 
                 formattedKey.includes('END RSA PRIVATE KEY') ||
                 formattedKey.includes('END EC PRIVATE KEY');

  if (!hasBegin || !hasEnd) {
    throw new Error(
      'Firebase private_key must be a valid PEM-formatted key with BEGIN and END markers. ' +
      'Please check your FIREBASE_PRIVATE_KEY, FIREBASE_PRIVATE_KEY_BASE64, or FIREBASE_SERVICE_ACCOUNT_JSON configuration.'
    );
  }

  // Ensure the key ends with a newline (PEM format requirement)
  if (!formattedKey.endsWith('\n')) {
    formattedKey = formattedKey + '\n';
  }

  // Validate key format before passing to Firebase Admin SDK
  // Note: We'll let Firebase Admin SDK do the final validation since it's more strict
  // but we can log warnings if Node.js crypto can't parse it
  const isValidFormat = validatePrivateKeyFormat(formattedKey);
  if (!isValidFormat) {
    console.warn(
      '[firebase_storage_utils] Warning: Private key failed Node.js crypto validation. ' +
      'This may indicate a format issue, but Firebase Admin SDK will make the final determination.'
    );
    // Don't throw here - let Firebase Admin SDK provide the actual error message
  }

  // Try to create the credential with better error handling
  try {
    return {
      credential: admin.credential.cert({
        projectId,
        privateKey: formattedKey,
        clientEmail,
      }),
      storageBucket,
    };
  } catch (error) {
    // Catch OpenSSL/decoder errors and provide helpful guidance
    if (error.code === 'ERR_OSSL_UNSUPPORTED' || 
        error.message.includes('DECODER') || 
        error.message.includes('unsupported') ||
        error.message.includes('Invalid PEM') ||
        error.code === 'app/invalid-credential') {
      
      // Provide detailed troubleshooting guidance
      const troubleshooting = [
        '1. Ensure your private key is in PEM format with proper BEGIN/END markers',
        '2. The key must have actual newline characters (\\n), not escaped \\\\n',
        '3. Base64 content should be split into lines (64 characters per line is standard)',
        '4. If using FIREBASE_SERVICE_ACCOUNT_JSON, verify the private_key field is correctly formatted',
        '5. On Render/Vercel, consider using FIREBASE_PRIVATE_KEY_BASE64 to avoid newline issues',
        '6. Verify the key is not truncated or corrupted'
      ].join('\n   ');

      throw new Error(
        `Firebase private key format error: ${error.message}\n\n` +
        `Troubleshooting steps:\n   ${troubleshooting}\n\n` +
        `Key format check: Has BEGIN marker: ${formattedKey.includes('BEGIN')}, ` +
        `Has END marker: ${formattedKey.includes('END')}, ` +
        `Has newlines: ${formattedKey.includes('\n')}, ` +
        `Key length: ${formattedKey.length} characters`
      );
    }
    throw error;
  }
}

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

    // Get Firebase configuration from environment variables (supports multiple formats)
    const firebaseConfig = getFirebaseConfigFromEnv();

    // Log configuration status (without sensitive data)
    console.log('[firebase_storage_utils] Initializing Firebase Admin SDK...');
    console.log('[firebase_storage_utils] Storage Bucket:', firebaseConfig.storageBucket);
    
    // Check which environment variables are set (for debugging)
    const hasServiceAccountJson = !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT);
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
    const hasPrivateKeyBase64 = !!process.env.FIREBASE_PRIVATE_KEY_BASE64;
    console.log('[firebase_storage_utils] Config source:', 
      hasServiceAccountJson ? 'FIREBASE_SERVICE_ACCOUNT_JSON' : 
      hasPrivateKey ? 'FIREBASE_PRIVATE_KEY' : 
      hasPrivateKeyBase64 ? 'FIREBASE_PRIVATE_KEY_BASE64' : 'none');

    // Initialize Firebase Admin
    admin.initializeApp(firebaseConfig);
    firebaseInitialized = true;

    console.log('[firebase_storage_utils] Firebase Admin SDK initialized successfully');
    return Promise.resolve(true);
  } catch (error) {
    console.error('[firebase_storage_utils] Firebase initialization error:', error);
    
    // Provide more helpful error messages for common issues
    if (error.message.includes('private_key') || error.code === 'ERR_OSSL_UNSUPPORTED') {
      const errorMsg = error.message.includes('DECODER') || error.code === 'ERR_OSSL_UNSUPPORTED'
        ? 'Private key format is not supported or corrupted. Firebase requires PKCS#8 format (BEGIN PRIVATE KEY).'
        : error.message;
      
      throw new Error(
        `Failed to initialize Firebase: ${errorMsg} ` +
        'Please check your FIREBASE_PRIVATE_KEY, FIREBASE_PRIVATE_KEY_BASE64, or FIREBASE_SERVICE_ACCOUNT_JSON environment variable. ' +
        'Ensure the private key is properly formatted with actual newlines (not \\n) and contains both BEGIN and END markers.'
      );
    }
    
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
    
    // Provide helpful error messages for common issues
    if (error.message && error.message.includes('bucket does not exist')) {
      const bucket = getStorage().bucket();
      throw new Error(
        `Firebase Storage bucket does not exist: ${bucket.name}\n\n` +
        `To fix this:\n` +
        `1. Go to Firebase Console: https://console.firebase.google.com/\n` +
        `2. Select your project: ${process.env.FIREBASE_PROJECT_ID || 'your-project'}\n` +
        `3. Navigate to Storage section\n` +
        `4. Create a bucket or verify the bucket name\n` +
        `5. Set FIREBASE_STORAGE_BUCKET environment variable with the correct bucket name\n\n` +
        `Common bucket name formats:\n` +
        `- ${process.env.FIREBASE_PROJECT_ID || 'project-id'}.appspot.com (default)\n` +
        `- ${process.env.FIREBASE_PROJECT_ID || 'project-id'}.firebasestorage.app (newer format)\n` +
        `- Custom bucket name you created\n\n` +
        `Current bucket being used: ${bucket.name}`
      );
    }
    
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

