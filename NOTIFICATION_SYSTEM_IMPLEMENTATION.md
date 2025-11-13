# Notification System Implementation Summary

## Overview
A comprehensive notification system has been implemented for both the admin website and mobile app. The system sends notifications for various events and includes a scheduled daily prediction job.

## What Was Implemented

### 1. Database Schema
- **Notification Model** added to Prisma schema with:
  - `id`, `title`, `message`, `type`
  - `userId` (nullable for company-wide notifications)
  - `companyId` (required)
  - `isRead`, `readAt`
  - `metadata` (JSON for additional data)
  - Proper indexes for performance

### 2. Backend API
- **Notification Controller** (`server-api/controllers/notificationController.js`):
  - `getNotifications` - Get notifications with pagination
  - `markAsRead` - Mark single notification as read
  - `markAllAsRead` - Mark all notifications as read
  - `getUnreadCount` - Get count of unread notifications
  - `deleteNotification` - Delete a notification

- **Notification Routes** (`server-api/routes/notificationRoutes.js`):
  - `GET /api/notifications` - Get notifications
  - `GET /api/notifications/unread-count` - Get unread count
  - `PUT /api/notifications/:id/read` - Mark as read
  - `PUT /api/notifications/read-all` - Mark all as read
  - `DELETE /api/notifications/:id` - Delete notification

- **Notification Service** (`server-api/services/notificationService.js`):
  - `notifyCompanyPredictionCreated` - Notify mobile users when admin creates prediction
  - `notifyDengueCaseAdded` - Notify admins when dengue case is added
  - `notifyDroneChange` - Notify admins when drone is created/updated
  - `notifyDroneImagesUploaded` - Notify admins when drone images are uploaded
  - `notifyCompanyLocationChange` - Notify admins when location is created/updated
  - `notifyDailyPrediction` - Notify mobile users for daily predictions

### 3. Notification Integration Points

#### Company Prediction Creation
- **Location**: `server-api/controllers/predictionController.js`
- **Functions**: `predictCompany`, `predictCompanyThreeModels`, `predictPublicEnhanced` (when companyId provided)
- **Recipients**: All mobile users (role='user') in the same company

#### Dengue Data Creation
- **Location**: `server-api/controllers/dengueDataController.js`
- **Functions**: `create`, `uploadCSV`
- **Recipients**: All admin users (role='admin') in the same company

#### Drone Operations
- **Location**: `server-api/controllers/droneController.js`
- **Functions**: `registerDrone`, `updateDrone`, `uploadImages`, `uploadVideoFrames`
- **Recipients**: All admin users (role='admin') in the same company

#### Company Location Operations
- **Location**: `server-api/controllers/companyLocationController.js`
- **Functions**: `create`, `update`
- **Recipients**: All admin users (role='admin') in the same company

### 4. Scheduled Job
- **Daily Prediction Job** (`server-api/jobs/dailyPredictionJob.js`):
  - Runs daily at 12:00 PM Malaysia time (04:00 UTC)
  - Gets all verified mobile users
  - Uses their last known location from PredictionLog
  - Calls prediction API for each user
  - Sends notification with risk assessment
  - Integrated into `server-api/index.js`

### 5. Mobile App Updates
- **Notification API Functions** (`client-mobile/utils/userApi.js`):
  - `getNotifications` - Fetch notifications
  - `getUnreadNotificationCount` - Get unread count
  - `markNotificationAsRead` - Mark as read
  - `markAllNotificationsAsRead` - Mark all as read

- **Notification Page** (`client-mobile/app/notification.tsx`):
  - Fetches real notifications from API
  - Displays notifications with proper formatting
  - Shows unread indicators
  - Pull-to-refresh functionality
  - Mark as read on tap

### 6. Dependencies Added
- `node-cron` - For scheduled jobs (added to `server-api/package.json`)

## Next Steps

### 1. Run Database Migration
```bash
cd server-api
npx prisma migrate dev --name add_notification_model
npx prisma generate
```

### 2. Install Dependencies
```bash
cd server-api
npm install
```

### 3. Admin Website Notification Page (TODO)
A notification page/component needs to be created for the admin website. You can:
- Create a new page at `client-admin/src/app/notifications/page.tsx`
- Add notification API functions to `client-admin/src/lib/api.ts`
- Display notifications similar to the mobile app
- Add notification badge/indicator in the navigation

### 4. Testing
- Test notification creation for each event type
- Test notification retrieval on mobile app
- Test daily prediction job (you may want to test with a manual trigger first)
- Test mark as read functionality
- Verify notifications are sent to correct users based on company

### 5. Optional Enhancements
- Add push notifications (using Expo Notifications or Firebase Cloud Messaging)
- Add email notifications for critical alerts
- Add notification preferences/settings
- Add notification filtering by type
- Add notification search functionality
- Store user's last known location for better daily predictions

## Notification Types

1. **prediction** - Company prediction created by admin
2. **dengue_case** - New dengue case added
3. **drone** - Drone created or updated
4. **drone_image** - Drone images uploaded
5. **location** - Company location created or updated
6. **daily_prediction** - Daily automatic prediction

## API Endpoints

All notification endpoints require authentication (Bearer token):

- `GET /api/notifications?limit=50&offset=0&unreadOnly=false`
- `GET /api/notifications/unread-count`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`
- `DELETE /api/notifications/:id`

## Notes

- Notifications are company-scoped - users only see notifications for their company
- Mobile users see company-wide notifications (userId=null) and their own notifications
- Admin users see company-wide notifications and their own notifications
- Notification creation failures don't break the main operations (wrapped in try-catch)
- Daily prediction job uses user's last known location from PredictionLog
- If a user has no previous prediction, they will be skipped in the daily job

