# server-api utilities

Shared helpers used by the Express API under `server-api/utils/`.

## Modules

| File | Role |
|------|------|
| `firebase_storage_utils.js` | Upload, download, and delete drone images in Firebase Storage (service account auth). |
| `logger.js` | Winston-based structured logging (levels, transports). |
| `sentry.js` | Optional Sentry (`@sentry/node`, profiling) when `SENTRY_DSN` is set. |
| `errorResponse.js` | Consistent JSON error payloads and logging for controllers. |
| `riskLevelUtils.js` | Map risk scores to `low` / `medium` / `high` using company threshold settings. |

## Firebase Storage (`firebase_storage_utils.js`)

Typical usage:

```javascript
const { uploadImage, downloadImage, deleteImage } = require('./utils/firebase_storage_utils');

const url = await uploadImage('/tmp/image.jpg', 'drone-images/abc123.jpg');
const buffer = await downloadImage('https://storage.googleapis.com/...');
await deleteImage('drone-images/abc123.jpg');
```

Set these environment variables (see [Firebase Storage migration](../../docs/firebase-storage-migration.md)):

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=project.appspot.com
```

Credentials (one of):

- `FIREBASE_PRIVATE_KEY` — PEM string with `\n` newlines  
- `FIREBASE_PRIVATE_KEY_BASE64` — base64-encoded key  
- `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON string for the service account  

## Sentry

Set `SENTRY_DSN` in the API environment to enable error and performance data; initialization is handled in `sentry.js`.
