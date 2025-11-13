# Push Notifications Implementation Guide

## Overview
Push notifications have been implemented for the mobile app using Expo Notifications. This allows users to receive real-time notifications even when the app is closed.

## What Was Implemented

### 1. Mobile App (client-mobile)

#### Configuration
- **app.json**: Added Expo Notifications plugin configuration
  - Notification icon and color
  - Android notification channel setup
  - iOS foreground display settings

#### Push Notification Service (`utils/pushNotifications.ts`)
- `registerForPushNotificationsAsync()` - Request permissions and get Expo push token
- `registerDeviceToken()` - Register device token with backend
- `unregisterDeviceToken()` - Unregister device token on logout
- `initializePushNotifications()` - Initialize push notifications on login
- `setupNotificationListeners()` - Setup listeners for received and tapped notifications
- `getBadgeCount()` / `setBadgeCount()` - Manage notification badge count
- `clearAllNotifications()` - Clear all notifications

#### Integration Points
- **Login** (`app/(auth)/login.tsx`): Initializes push notifications after successful login
- **App Layout** (`app/_layout.tsx`): 
  - Sets up notification listeners when user is authenticated
  - Updates badge count on app start
  - Handles notification taps with deep linking
- **Profile** (`app/profile.tsx`): Unregisters device token on logout
- **Notification Page** (`app/notification.tsx`): Updates badge count when notifications are read

### 2. Backend (server-api)

#### Database Schema
- **DeviceToken Model**: Stores device push tokens
  - `userId` - Links to user
  - `pushToken` - Expo push token (unique)
  - `platform` - 'ios' or 'android'
  - `isActive` - Whether token is active

#### Device Token Controller (`controllers/deviceTokenController.js`)
- `registerDevice()` - Register device token
- `unregisterDevice()` - Unregister device token
- `getDeviceTokens()` - Get all device tokens for a user

#### Routes (`routes/notificationRoutes.js`)
- `POST /api/notifications/register-device` - Register device
- `POST /api/notifications/unregister-device` - Unregister device
- `GET /api/notifications/device-tokens` - Get user's device tokens

#### Notification Service Updates (`services/notificationService.js`)
- `sendPushNotification()` - Send push notifications via Expo Push API
- `getPushTokensForUsers()` - Get push tokens for multiple users
- Updated all notification functions to send push notifications:
  - `notifyCompanyPredictionCreated()` - Sends push to mobile users
  - `notifyDailyPrediction()` - Sends push for daily predictions

## How It Works

### Flow Diagram

```
1. User Logs In
   ↓
2. App Requests Notification Permissions
   ↓
3. App Gets Expo Push Token
   ↓
4. App Registers Token with Backend
   ↓
5. Backend Stores Token in Database
   ↓
6. When Event Occurs (e.g., admin creates prediction)
   ↓
7. Backend Creates In-App Notification
   ↓
8. Backend Gets Push Tokens for Users
   ↓
9. Backend Sends Push via Expo Push API
   ↓
10. Expo Delivers Push to Devices
   ↓
11. User Receives Notification (even if app closed)
   ↓
12. User Taps Notification → App Opens → Navigates to Relevant Screen
```

### Push Notification Features

1. **Real-time Delivery**: Notifications appear instantly on user's device
2. **Works When App Closed**: Notifications appear even when app is not running
3. **Badge Count**: App icon shows unread notification count
4. **Sound & Vibration**: Default system sounds and vibrations
5. **Deep Linking**: Tapping notification opens app and navigates to relevant screen
6. **Priority**: High-risk notifications use high priority

## Setup Instructions

### 1. Run Database Migration

```bash
cd server-api
npx prisma migrate dev --name add_device_token_model
npx prisma generate
```

### 2. Install Dependencies

All required packages are already installed:
- `expo-notifications` (already in package.json)
- `axios` (already in server-api package.json)

### 3. Expo Project Configuration

For production, you'll need to configure Expo project ID:

**Option A: Using EAS (Recommended)**
```bash
cd client-mobile
npx eas build:configure
```

This will create an `eas.json` file. The project ID will be automatically configured.

**Option B: Manual Configuration**
Add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### 4. Testing Push Notifications

#### Development Testing
1. Use Expo Go app on a physical device (simulators don't support push notifications)
2. Run the app: `npm start`
3. Log in to the app
4. Grant notification permissions when prompted
5. Check console logs for push token

#### Production Testing
1. Build the app with EAS: `npx eas build`
2. Install on physical device
3. Test push notifications

### 5. Testing the Flow

1. **Register Device**:
   - Log in to mobile app
   - Check server logs for "Device token registered successfully"
   - Verify token is stored in database

2. **Send Test Notification**:
   - Admin creates a company prediction
   - Mobile users should receive push notification
   - Check Expo Push API response in server logs

3. **Test Notification Tap**:
   - Tap on received notification
   - App should open and navigate to dashboard

4. **Test Badge Count**:
   - Check app icon badge count
   - Should update when notifications are received/read

## API Endpoints

### Device Token Management
- `POST /api/notifications/register-device`
  - Body: `{ pushToken: string, platform: 'ios' | 'android' }`
  - Requires: Authentication

- `POST /api/notifications/unregister-device`
  - Body: `{ pushToken: string }`
  - Requires: Authentication

- `GET /api/notifications/device-tokens`
  - Returns: `{ tokens: DeviceToken[] }`
  - Requires: Authentication

## Notification Types with Push

All notification types now support push notifications:

1. **prediction** - Company prediction created → Push to mobile users
2. **daily_prediction** - Daily automatic prediction → Push to mobile users
3. **dengue_case** - Dengue case added → Push to admin users (optional - can be added)
4. **drone** - Drone created/updated → Push to admin users (optional - can be added)
5. **drone_image** - Drone images uploaded → Push to admin users (optional - can be added)
6. **location** - Location created/updated → Push to admin users (optional - can be added)

## Important Notes

### Expo Push Token Format
Expo push tokens look like: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`

### Token Management
- Tokens are stored per user (one user can have multiple devices)
- Tokens are automatically deactivated on logout
- Old/invalid tokens are handled gracefully by Expo Push API

### Error Handling
- Push notification failures don't break the main flow
- Errors are logged but don't prevent in-app notifications
- Invalid tokens are automatically filtered by Expo

### Badge Count
- Badge count is synced with unread notification count
- Updates automatically when:
  - App starts
  - Notification is received
  - Notification is marked as read

### Deep Linking
- Prediction notifications → Navigate to `/dashboard`
- Other notifications → Navigate to `/notification`
- Can be customized in `app/_layout.tsx`

## Troubleshooting

### Push Notifications Not Working

1. **Check Permissions**:
   - Ensure user granted notification permissions
   - Check device settings

2. **Check Token Registration**:
   - Verify token is stored in database
   - Check server logs for registration errors

3. **Check Expo Push API**:
   - Verify Expo Push API is accessible
   - Check server logs for API errors

4. **Check Device**:
   - Must be physical device (not simulator)
   - Must have internet connection

5. **Check Project ID**:
   - Ensure Expo project ID is configured
   - Check `app.json` or `eas.json`

### Common Issues

**Issue**: "Must use physical device for Push Notifications"
- **Solution**: Use a real device, not a simulator

**Issue**: "Failed to get push token"
- **Solution**: Check notification permissions are granted

**Issue**: Push notifications not received
- **Solution**: 
  - Check token is registered in database
  - Verify Expo Push API is working
  - Check device has internet connection

## Next Steps (Optional Enhancements)

1. **Add Push for Admin Notifications**: Currently only mobile users get push. Can add for admin users too.

2. **Notification Categories**: Group notifications by type with different sounds/priorities

3. **Rich Notifications**: Add images, actions buttons to notifications

4. **Notification Scheduling**: Schedule notifications for specific times

5. **Notification Preferences**: Let users choose which types of notifications to receive

6. **Analytics**: Track notification delivery and open rates

## Production Checklist

- [ ] Configure Expo project ID
- [ ] Test on physical devices (iOS and Android)
- [ ] Verify push notifications work in production build
- [ ] Test notification delivery for all notification types
- [ ] Verify badge count updates correctly
- [ ] Test deep linking from notifications
- [ ] Monitor Expo Push API usage and limits
- [ ] Set up error monitoring for push notification failures

