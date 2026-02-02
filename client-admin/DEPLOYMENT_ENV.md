# Environment Variables for client-admin Deployment

## Required Environment Variables

### 1. `NEXT_PUBLIC_API_URL` ⚠️ **REQUIRED**
- **Description**: Base URL for the backend API server
- **Default**: `http://localhost:4000` (development)
- **Production Example**: `https://api.yourdomain.com` or `https://your-api-server.com`
- **Usage**: Used throughout the application for all API calls
- **Note**: Must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser

**Files using this variable:**
- `src/lib/api.ts` (main API client)
- `src/lib/threeModelPredictionApi.js`
- `src/app/dashboard/page.tsx`
- `src/app/data-management/page.tsx`
- `src/app/drone-management/page.tsx`
- `src/app/user-management/page.tsx`
- `src/app/weather-data/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/reports/page.tsx`
- `src/components/AdminHeader.tsx`
- `src/components/MapPicker.tsx`
- `src/components/ThreeModelPrediction.jsx`

## Optional Environment Variables

### 2. `NODE_ENV`
- **Description**: Node.js environment mode
- **Default**: Automatically set by Next.js during build (`production` for builds)
- **Values**: `development`, `production`, `test`
- **Note**: Usually handled automatically by the deployment platform

### 3. Sentry Configuration (Optional)
If you plan to use Sentry for error tracking (package is installed but not configured):
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry Data Source Name
- `SENTRY_ORG` - Sentry organization slug
- `SENTRY_PROJECT` - Sentry project name
- `SENTRY_AUTH_TOKEN` - Sentry authentication token

## Issues Found

### ⚠️ Bug in `src/app/dashboard/page.tsx`
Line 109 uses `process.env.API_BASE_URL` which is incorrect. It should be `process.env.NEXT_PUBLIC_API_URL`.

**Current code:**
```typescript
const response = await fetch(`${process.env.API_BASE_URL}/drones/recent-images`, {
```

**Should be:**
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drones/recent-images`, {
```

## Deployment Checklist

### Before Deployment:
- [ ] Set `NEXT_PUBLIC_API_URL` to your production API URL
- [ ] Fix the bug in `src/app/dashboard/page.tsx` (line 109)
- [ ] Ensure your API server is accessible from the deployment domain
- [ ] Configure CORS on your API server to allow requests from your frontend domain

### Environment Variable Setup Examples:

#### Vercel:
```bash
# In Vercel dashboard or CLI
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://api.yourdomain.com
```

#### Docker:
```dockerfile
# In Dockerfile or docker-compose.yml
ENV NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

#### Docker Compose:
```yaml
environment:
  - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

#### Kubernetes:
```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "https://api.yourdomain.com"
```

#### Cloud Run / Cloud Functions:
```bash
gcloud run deploy client-admin \
  --set-env-vars NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Next.js Environment Variable Notes

1. **Client-side variables** must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
2. **Server-side variables** (without `NEXT_PUBLIC_`) are only available in API routes and server components
3. Environment variables are embedded at **build time**, not runtime
4. After changing environment variables, you must **rebuild** the application

## Testing Your Configuration

After deployment, verify:
1. Check browser console for API connection errors
2. Test login functionality
3. Verify API calls are going to the correct endpoint
4. Check network tab in browser DevTools to confirm API URL
