# Server API Utilities

## Firebase Storage Utilities

The `firebase_storage_utils.js` module provides functions for managing images in Firebase Storage.

### Usage

```javascript
const { uploadImage, downloadImage, deleteImage } = require('./utils/firebase_storage_utils');

// Upload an image
const url = await uploadImage('/tmp/image.jpg', 'drone-images/abc123.jpg');

// Download an image
const buffer = await downloadImage('https://storage.googleapis.com/...');

// Delete an image
await deleteImage('drone-images/abc123.jpg');
```

### Configuration

Set these environment variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=project.appspot.com
```

See [Firebase Storage Migration Guide](../../docs/firebase-storage-migration.md) for setup instructions.

