# CircleCI Migration Guide - Complete Workflow Duplication

This guide explains how all your GitHub Actions workflows have been migrated to CircleCI.

## 📋 Workflow Mapping

| GitHub Actions Workflow | CircleCI Workflow | Status |
|-------------------------|-------------------|--------|
| `scrap-dengue-data-script.yml` | `daily-data-processing` | ✅ Migrated |
| `reverse-geocode-dengue-data.yml` | `reverse-geocode-manual` + part of `daily-data-processing` | ✅ Migrated |
| `deploy-server-ml.yml` | `deploy-server-ml-workflow` | ✅ Migrated |
| `deploy-server-api.yml` | `deploy-server-api-workflow` | ✅ Migrated |
| `location-alert-notification.yml` | `daily-location-alerts` | ✅ Migrated |
| `daily-bulk-prediction.yml` | `daily-bulk-prediction-workflow` | ✅ Migrated |

## 🔐 Required Environment Variables

Add these in **CircleCI → Project Settings → Environment Variables**:

### Database & Core Services
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password
- `REDIS_USERNAME` - Redis username (if applicable)
- `ML_SERVICE_URL` - ML service endpoint URL

### Google Cloud Platform (for deployments)
- `GCP_PROJECT_ID` - Your GCP project ID
- `GCP_SA_KEY` - Base64-encoded Google Cloud service account JSON key
  - To encode: `cat service-account.json | base64 -w0`
  - Or in CircleCI, paste the JSON directly (CircleCI will handle it)

### Firebase
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket name
- `FIREBASE_PRIVATE_KEY_BASE64` - Base64-encoded Firebase private key

### Email & SMS
- `SENDER_EMAIL` - Email address for sending notifications
- `SENDER_EMAIL_PW` - Email password or app password
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

### API & Monitoring
- `API_BASE_URL` - Your API base URL (e.g., `https://api.yourdomain.com`)
- `API_ADMIN_EMAIL` - Admin email for API authentication
- `API_ADMIN_PASSWORD` - Admin password for API authentication
- `LOCATION_ALERT_API_KEY` - API key for location alerts
- `SENTRY_DSN` - Sentry DSN for error tracking

### GitHub (for committing changes)
- `GH_PAT` - GitHub Personal Access Token with `repo` scope
  - Create at: https://github.com/settings/tokens
  - Required for the daily data processing script to commit changes

## 📅 Scheduled Workflows

### Daily Data Processing
- **Schedule**: Daily at 1:00 PM UTC (9:00 PM Malaysia time)
- **Workflow**: `daily-data-processing`
- **Jobs**: 
  1. `run-dengue-data-script` - Scrapes data, trains models, stores to DB
  2. `reverse-geocode-dengue-data` - Runs after data processing completes

### Daily Location Alerts
- **Schedule**: Daily at 4:00 AM UTC (12:00 PM Malaysia time)
- **Workflow**: `daily-location-alerts`
- **Job**: `location-alert-notification`

### Daily Bulk Predictions
- **Schedule**: Daily at 4:00 AM UTC (12:00 PM Malaysia time)
- **Workflow**: `daily-bulk-prediction-workflow`
- **Job**: `daily-bulk-prediction`

## 🚀 Deployment Workflows

### Deploy Server ML
- **Trigger**: Push to `main`/`master` when `server-ml/**` changes
- **Workflow**: `deploy-server-ml-workflow`
- **Job**: `deploy-server-ml`

### Deploy Server API
- **Trigger**: Push to `main`/`master` when `server-api/**` changes
- **Workflow**: `deploy-server-api-workflow`
- **Job**: `deploy-server-api`

## 🔧 Manual Triggers

### Reverse Geocode (Manual)
You can manually trigger reverse geocoding with custom parameters:
- Go to CircleCI → Pipelines → Trigger Pipeline
- Select `reverse-geocode-manual` workflow
- Parameters:
  - `batch_size`: Default "100"
  - `delay_seconds`: Default "1.5"
  - `resume_from_id`: Default "" (empty)

### All Other Workflows
All workflows can be manually triggered from the CircleCI dashboard.

## 🔄 Key Differences from GitHub Actions

### 1. Scheduled Workflows
- **GitHub Actions**: Uses `on.schedule.cron`
- **CircleCI**: Uses `triggers.schedule.cron` in workflow definition
- Both support the same cron syntax

### 2. Path Filters
- **GitHub Actions**: `on.push.paths`
- **CircleCI**: `filters.paths` in job definition
- Same functionality, different syntax

### 3. Manual Triggers
- **GitHub Actions**: `workflow_dispatch` with inputs
- **CircleCI**: Manual trigger via UI or API, parameters defined in job
- CircleCI supports parameters via job parameters

### 4. Workflow Dependencies
- **GitHub Actions**: `workflow_run` trigger
- **CircleCI**: `requires` in workflow definition
- CircleCI workflows can depend on other jobs in the same workflow

### 5. Artifacts
- **GitHub Actions**: `actions/upload-artifact`
- **CircleCI**: `store_artifacts` step
- Both store files for download

### 6. Environment Variables
- **GitHub Actions**: `secrets.*` in workflow
- **CircleCI**: Environment variables set in project settings
- Access via `${VARIABLE_NAME}` in commands

## 🐛 Troubleshooting

### Scheduled Workflows Not Running
- Check that schedules are enabled in CircleCI project settings
- Verify cron syntax is correct
- Ensure branch filters match your active branch

### Deployment Fails
- Verify `GCP_SA_KEY` is correctly base64-encoded
- Check that GCP service account has necessary permissions
- Ensure `GCP_PROJECT_ID` is correct

### Git Push Fails
- Verify `GH_PAT` has `repo` scope
- Check that the token hasn't expired
- Ensure the branch name matches `${CIRCLE_BRANCH}`

### API Calls Fail
- Verify all API-related environment variables are set
- Check that `API_BASE_URL` includes the protocol (https://)
- Ensure API endpoints are accessible from CircleCI

## 📝 Next Steps

1. **Set up environment variables** in CircleCI project settings
2. **Test manual triggers** for each workflow
3. **Verify scheduled workflows** are running at the correct times
4. **Monitor first few runs** to ensure everything works correctly
5. **Disable GitHub Actions** once CircleCI is confirmed working

## 🔗 Useful Links

- [CircleCI Documentation](https://circleci.com/docs/)
- [CircleCI Scheduled Builds](https://circleci.com/docs/scheduled-builds/)
- [CircleCI Environment Variables](https://circleci.com/docs/env-vars/)
- [CircleCI Manual Triggers](https://circleci.com/docs/manual-workflows/)
