# GitHub Actions Setup for Daily Bulk Prediction

This guide explains how to set up the GitHub Actions workflow to automatically trigger bulk predictions daily at 12 PM Malaysian time.

## Overview

The workflow (`daily-bulk-prediction.yml`) will:
1. Run daily at 12:00 PM Malaysian time (4:00 AM UTC)
2. Authenticate with the API using admin credentials
3. Call the `/api/predict/bulk` endpoint
4. Generate predictions for all company locations across all companies
5. Automatically send notifications to all admins and mobile users

## Prerequisites

1. A GitHub repository with Actions enabled
2. An admin user account in your system with valid credentials
3. Access to your API server

## Setup Instructions

### Step 1: Create GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Create the following secrets:

#### 1. `API_BASE_URL`
- **Value**: Your API base URL (e.g., `https://api.yourdomain.com` or `http://localhost:4000` for local testing)
- **Example**: `https://api.dengueeye.com`

#### 2. `API_ADMIN_EMAIL`
- **Value**: Email address of an admin user account
- **Example**: `admin@yourcompany.com`
- **Note**: This should be an admin account (role='admin') that has access to all companies

#### 3. `API_ADMIN_PASSWORD`
- **Value**: Password for the admin user account
- **Note**: Keep this secure and never commit it to the repository

### Step 2: Verify Workflow File

The workflow file is located at `.github/workflows/daily-bulk-prediction.yml`. It should already be in your repository.

### Step 3: Test the Workflow

1. Go to your GitHub repository → **Actions** tab
2. Select "Daily Bulk Prediction" workflow
3. Click "Run workflow" → "Run workflow" (manual trigger)
4. Monitor the workflow execution

### Step 4: Verify Execution

After the workflow runs:
- Check the workflow logs in the Actions tab
- Verify that predictions were created in your database
- Check that notifications were sent to users

## Workflow Schedule

The workflow runs daily at:
- **Malaysian Time**: 12:00 PM (noon)
- **UTC Time**: 4:00 AM
- **Cron Expression**: `0 4 * * *`

To change the schedule, edit the cron expression in `.github/workflows/daily-bulk-prediction.yml`:

```yaml
- cron: '0 4 * * *'  # minute hour day month day-of-week
```

### Common Cron Examples

- `0 4 * * *` - Daily at 4 AM UTC (12 PM Malaysia)
- `0 6 * * *` - Daily at 6 AM UTC (2 PM Malaysia)
- `0 0 * * *` - Daily at midnight UTC (8 AM Malaysia)
- `0 12 * * 1` - Every Monday at 12 PM UTC (8 PM Malaysia)

## Manual Trigger

You can also trigger the workflow manually:
1. Go to **Actions** → **Daily Bulk Prediction**
2. Click **Run workflow**
3. Select the branch and click **Run workflow**

## Troubleshooting

### Workflow Fails with "Failed to get token"
- Verify `API_BASE_URL` is correct and accessible
- Check that `API_ADMIN_EMAIL` and `API_ADMIN_PASSWORD` are correct
- Ensure the admin account exists and is active

### Workflow Fails with "Bulk prediction failed"
- Check API server logs
- Verify ML service is running and accessible
- Check database connectivity
- Review the error response in workflow logs

### Workflow Times Out
- The workflow has a 30-minute timeout
- If processing many locations, consider:
  - Increasing the timeout in the workflow
  - Processing in batches
  - Optimizing the prediction service

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Use strong passwords** for the admin account
3. **Rotate credentials** periodically
4. **Monitor workflow runs** for unauthorized access
5. **Use environment-specific secrets** for different environments (dev/staging/prod)

## Alternative: Service Account Token

Instead of using login credentials, you could:
1. Create a service account endpoint that generates long-lived tokens
2. Store the token as a GitHub Secret
3. Use the token directly without login

This approach is more secure but requires additional API development.

## Support

For issues or questions:
1. Check the workflow logs in GitHub Actions
2. Review API server logs
3. Check database for prediction records
4. Verify notification service is working

