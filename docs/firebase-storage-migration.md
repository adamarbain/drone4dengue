# Firebase Storage Migration Guide

## Overview

This document describes the migration from local filesystem storage to Firebase Storage for drone images in the Drone4Dengue project.

## Migration Date

**Status**: Completed ✅

## What Changed

### Before Migration
- Images were stored in `server-api/uploads/drones/` directory
- URLs were relative paths: `/uploads/drones/filename.jpg`
- Images were served via Express static middleware
- Local file deletion required filesystem operations

### After Migration
- Images are stored in Firebase Storage
- URLs are absolute Firebase URLs: `https://storage.googleapis.com/bucket-name/path/to/file.jpg`
- Images are publicly accessible via Firebase Storage
- File deletion uses Firebase Storage API

## Architecture

### Storage Flow

```
Client Upload
    ↓
Multer (temporary local storage)
    ↓
Firebase Storage Upload
    ↓
Delete temporary local file
    ↓
Store Firebase URL in database
```

### Prediction Flow

```
Database (Firebase URL)
    ↓
predictionController.js (extract URL)
    ↓
ML Service (fetch from Firebase URL)
    ↓
breeding_area_detection_service.py (requests.get())
```

## Firebase Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Firebase Storage Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Option 1: Multiline PEM (local/dev)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Option 2: Base64 PEM (recommended for Render/Vercel/Netlify)
FIREBASE_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...

# Option 3: Full service account JSON (literal or base64 encoded)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n..."}'
```

### Getting Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Extract the following from the JSON (or provide the JSON via `FIREBASE_SERVICE_ACCOUNT_JSON`):
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters) **or** base64-encode it for `FIREBASE_PRIVATE_KEY_BASE64`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - The storage bucket name (usually `your-project.appspot.com`)

### Storage Bucket Setup

1. Go to **Storage** in Firebase Console
2. Click **Get Started** if not already set up
3. Choose **Start in production mode** (or test mode if needed)
4. Select a location for your bucket
5. The bucket name will be in format: `your-project.appspot.com`

## Installation

Install Firebase Admin SDK:

```bash
cd server-api
npm install firebase-admin
```

## File Structure

### New Files

- `server-api/utils/firebase_storage_utils.js` - Firebase Storage utility functions

### Modified Files

- `server-api/controllers/droneController.js` - Updated upload/download/delete operations
- `server-api/controllers/predictionController.js` - Updated URL handling for Firebase URLs
- `server-api/package.json` - Added `firebase-admin` dependency
- `server-api/env.example` - Added Firebase configuration variables

## Key Functions

### `uploadImage(fileData, destinationPath, metadata)`

Uploads an image to Firebase Storage.

**Parameters:**
- `fileData`: File path (string) or Buffer
- `destinationPath`: Storage path (e.g., `drone-images/2025/01/filename.jpg`)
- `metadata`: Optional metadata object

**Returns:** Public Firebase URL (string)

**Example:**
```javascript
const url = await uploadImage('/tmp/image.jpg', 'drone-images/abc123.jpg');
// Returns: 'https://storage.googleapis.com/bucket-name/drone-images/abc123.jpg'
```

### `downloadImage(url)`

Downloads an image from Firebase Storage URL.

**Parameters:**
- `url`: Firebase Storage URL

**Returns:** Buffer containing image data

**Example:**
```javascript
const buffer = await downloadImage('https://storage.googleapis.com/...');
```

### `deleteImage(destinationPath)`

Deletes an image from Firebase Storage.

**Parameters:**
- `destinationPath`: Storage path to file

**Returns:** Boolean (true if successful)

## URL Format

### Firebase Storage URLs

Images are stored with public URLs:
```
https://storage.googleapis.com/BUCKET_NAME/path/to/file.jpg
```

### Storage Path Organization

Images are organized by:
- Type: `drone-images/` or `video-frames/`
- Year: `YYYY/`
- Month: `MM/`
- Unique filename: `originalname-timestamp-random.ext`

Example:
```
drone-images/2025/01/drone-photo-1737123456789-123456789.jpg
```

## Migration Steps for Existing Deployments

If you have existing images in local storage:

1. **Backup existing images** (optional)
   ```bash
   cp -r server-api/uploads/drones backups/
   ```

2. **Set up Firebase** (follow configuration steps above)

3. **Migrate existing images** (create a migration script if needed)

4. **Update database URLs** (if migrating existing records)
   - Old format: `/uploads/drones/filename.jpg`
   - New format: `https://storage.googleapis.com/bucket-name/...`

5. **Test the migration**
   - Upload a new image
   - Verify it appears in Firebase Storage
   - Test prediction with new image
   - Verify deletion works

## Backward Compatibility

The code maintains backward compatibility:

- **URL Detection**: Code checks if URL is Firebase URL (starts with `http://` or `https://`) or local path
- **Local Fallback**: If URL is relative, it's treated as local path (for old records)
- **Migration Support**: Old local files are still supported until fully migrated

## ML Service Compatibility

The ML service (`prediction_service.py` and `breeding_area_detection_service.py`) already supports URLs:

- Uses `requests.get()` to fetch images from URLs
- Works with both Firebase URLs and local URLs
- No changes needed in ML service code

## Testing

### Test Upload

1. Upload an image via API
2. Check Firebase Console → Storage to verify upload
3. Verify database record has Firebase URL

### Test Prediction

1. Create prediction with uploaded image
2. Check ML service logs for successful image fetch
3. Verify prediction completes successfully

### Test Delete

1. Delete an image via API
2. Verify image removed from Firebase Storage
3. Verify database record deleted

## Troubleshooting

### Firebase Initialization Error

**Error**: `Failed to initialize Firebase: ...`

**Solution**: 
- Check environment variables are set correctly
- Verify private key format (must include `\n` characters)
- Check service account has Storage permissions

### Upload Fails

**Error**: `Failed to upload image to Firebase`

**Solution**:
- Verify Firebase Storage bucket exists
- Check bucket permissions (should allow public read)
- Verify network connectivity to Firebase

### URL Not Accessible

**Error**: Image not loading from Firebase URL

**Solution**:
- Ensure file was made public: `file.makePublic()`
- Check Firebase Storage rules allow public read
- Verify URL format is correct

## Storage Rules (Firebase Console)

For public read access, set rules in Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null; // Or customize based on your auth
    }
  }
}
```

## Cost Considerations

- Firebase Storage offers free tier (5GB storage, 1GB/day download)
- Consider organizing files for easier management
- Monitor usage in Firebase Console → Usage and billing

## Security Notes

- Service account credentials are sensitive - never commit to git
- Use environment variables for all Firebase config
- Consider restricting write access via Firebase Storage rules
- Monitor access logs in Firebase Console

## Rollback Plan

If migration needs to be rolled back:

1. Revert code changes (git)
2. Reinstall dependencies: `npm install`
3. Images already in Firebase will remain (migrate back if needed)
4. New uploads will use local storage again

## Support

For issues or questions:
- Check Firebase Console for Storage errors
- Review server logs for detailed error messages
- Consult Firebase Storage documentation

---

**Migration Complete**: All image uploads now use Firebase Storage. Existing local files remain but new uploads go to Firebase.

