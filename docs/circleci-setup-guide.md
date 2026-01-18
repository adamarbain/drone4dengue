# CircleCI Setup Guide

This guide will help you migrate from GitHub Actions to CircleCI.

## Step 1: Sign Up for CircleCI

1. Go to [circleci.com](https://circleci.com)
2. Click **"Sign Up"** or **"Get Started"**
3. Choose **"Sign Up with GitHub"** (recommended) to connect your GitHub account
4. Authorize CircleCI to access your repositories

## Step 2: Add Your Project to CircleCI

1. After signing in, go to **"Projects"** in the left sidebar
2. Find your repository: `drone4dengue`
3. Click **"Set Up Project"**
4. CircleCI will detect your `.circleci/config.yml` file automatically
5. Click **"Use Existing Config"**
6. Select your branch (usually `main` or `master`)
7. Click **"Start Building"**

## Step 3: Configure Environment Variables (Secrets)

For your tests to run properly, you may need to add environment variables. Go to:
**Project Settings → Environment Variables**

### Required for Testing (if your tests need database access):
- `DATABASE_URL` - Your PostgreSQL connection string

### Optional (for future deployment workflows):
- `GCP_PROJECT_ID` - Google Cloud Project ID
- `GCP_SA_KEY` - Google Cloud Service Account JSON (base64 encoded)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_USERNAME`
- `ML_SERVICE_URL`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_PRIVATE_KEY_BASE64`
- `SENDER_EMAIL`, `SENDER_EMAIL_PW`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `API_BASE_URL`
- `SENTRY_DSN`
- `LOCATION_ALERT_API_KEY`
- `GH_PAT` - GitHub Personal Access Token (if you need to push commits)

**Note:** For the current test workflow, you only need `DATABASE_URL` if your tests actually connect to a database. The current config focuses on linting and building, which typically don't need database access.

## Step 4: Understanding CircleCI Free Tier

CircleCI's free tier (Free Plan) includes:
- **6,000 build minutes per month** (vs GitHub's 2,000 for free)
- Unlimited projects
- Unlimited users
- 30-day build history

This should be more than enough for your needs!

## Step 5: Your First Build

Once you've set up the project:
1. CircleCI will automatically trigger a build on your next push
2. Or you can manually trigger one by going to **"Pipelines"** → **"Trigger Pipeline"**
3. Watch the build progress in real-time

## Step 6: Viewing Build Results

- Go to **"Pipelines"** to see all builds
- Click on any build to see detailed logs
- Each job (test-client-admin, test-client-mobile, etc.) runs in parallel
- Green checkmark = success, Red X = failure

## Step 7: Enable Scheduled Workflows

**IMPORTANT:** Scheduled workflows in CircleCI require manual activation in the UI. They won't run automatically just from the config file.

### To Enable Scheduled Workflows:

1. Go to your CircleCI project dashboard
2. Click on **"Project Settings"** (gear icon)
3. Navigate to **"Scheduled Pipelines"** or **"Scheduled Workflows"**
4. You should see your scheduled workflows listed:
   - `daily-data-processing` (1pm UTC / 9pm Malaysia time)
   - `daily-location-alerts` (4am UTC / 12pm Malaysia time)
   - `daily-bulk-prediction-workflow` (4am UTC / 12pm Malaysia time)
5. **Enable each scheduled workflow** by toggling it on
6. Verify the cron schedule matches what's in your config

### Alternative Method (if Scheduled Pipelines section doesn't exist):

1. Go to **"Pipelines"** in the left sidebar
2. Click **"Schedule a new pipeline"** or **"Add Schedule"**
3. Select your branch (`main` or `master`)
4. Choose the workflow you want to schedule
5. Set the cron schedule (should match your config)
6. Save the schedule

### Verify Scheduled Workflows Are Active:

- Check the **"Scheduled Pipelines"** section in Project Settings
- You should see upcoming scheduled runs listed
- The first scheduled run will appear in your Pipelines list

**Note:** CircleCI uses UTC time for all scheduled workflows. Make sure your cron expressions match your intended local time (Malaysia time is UTC+8).

## Step 8: Disable GitHub Actions (Optional)

To save your remaining GitHub Actions minutes, you can:

1. **Temporarily disable workflows:**
   - Go to your GitHub repo → **Settings** → **Actions** → **General**
   - Under "Workflow permissions", you can disable workflows

2. **Or rename the workflows folder:**
   ```bash
   git mv .github/workflows .github/workflows.disabled
   git commit -m "Disable GitHub Actions workflows"
   git push
   ```

## Troubleshooting

### Build Fails with "No such file or directory"
- Make sure your `.circleci/config.yml` is in the root of your repository
- Check that the file paths in the config match your actual project structure

### Cache Not Working
- CircleCI caches are based on checksums of `package-lock.json` and `requirements.txt`
- If these files change, the cache will be invalidated (this is expected behavior)

### Tests Fail Due to Missing Environment Variables
- Go to **Project Settings → Environment Variables** and add the required variables
- Make sure variable names match exactly (case-sensitive)

### Need More Build Minutes
- CircleCI offers paid plans with more minutes
- Or you can optimize your builds by:
  - Using better caching strategies
  - Running only necessary jobs
  - Using smaller Docker images

## Next Steps

Your current CircleCI config focuses on **testing and linting**. If you want to add deployment workflows (like your GitHub Actions deployment to Cloud Run), you can:

1. Add deployment jobs to `.circleci/config.yml`
2. Set up GCP authentication in CircleCI
3. Configure deployment triggers

Would you like me to create deployment workflows for CircleCI as well?
