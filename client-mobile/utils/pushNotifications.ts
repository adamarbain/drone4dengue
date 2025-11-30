import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_URL } from './apiConfig';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // iOS 14+ additional presentation options
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions with retry logic for Firebase initialization
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A21C1C',
      sound: 'default',
    });
  }

  // Expo Go does not support remote push notifications on Android starting from SDK 53
  if (Constants.appOwnership === 'expo') {
    console.warn('Push notifications are not supported in Expo Go. Use a development build instead.');
    return null;
  }

  // Check if running on a physical device
  // Constants.isDevice is true for physical devices, false for simulators
  const isDevice = Constants.isDevice !== false;
  
  if (isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    // Add a small delay on Android to ensure Firebase is initialized
    // This is a workaround for timing issues
    if (Platform.OS === 'android') {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Retry logic for getting push token (handles Firebase initialization timing issues)
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 3000]; // Exponential backoff
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Use Constants.expoConfig?.extra?.eas?.projectId if available, otherwise use a fallback
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        token = tokenData.data;
        console.log('Notification Push token:', token);
        break; // Success, exit retry loop
      } catch (e: any) {
        const errorMessage = e?.message || String(e);
        const isFirebaseError = errorMessage.includes('FirebaseApp is not initialized') || 
                                errorMessage.includes('E_REGISTRATION_FAILED') ||
                                errorMessage.includes('Make sure to complete the guide');
        
        if (isFirebaseError && attempt < maxRetries - 1) {
          // Firebase not ready yet, wait and retry
          console.log(`[PUSH NOTIFICATIONS] Firebase not ready, retrying in ${retryDelays[attempt]}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
          continue;
        } else if (isFirebaseError) {
          // Final attempt failed with Firebase error
          console.error('[PUSH NOTIFICATIONS] Firebase is not initialized after retries. This usually means:');
          console.error('1. FCM credentials are not configured in EAS');
          console.error('2. The app was not rebuilt after configuring FCM credentials');
          console.error('3. google-services.json is missing or incorrectly configured');
          console.error('');
          console.error('To fix this:');
          console.error('1. Run: eas credentials (select Android → FCM)');
          console.error('2. Configure FCM credentials (upload service account JSON or enter server key)');
          console.error('3. Rebuild the app: eas build --profile preview --platform android');
          console.error('4. Install the new build and test again');
          console.error('');
          console.error('See FCM_SETUP_GUIDE.md for detailed instructions.');
          return null;
        } else {
          // Different error, try fallback
          console.error('Error getting push token:', e);
          break; // Exit retry loop to try fallback
        }
      }
    }
    
    // If we still don't have a token, try without projectId as fallback
    if (!token) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        token = tokenData.data;
        console.log('Push token (fallback):', token);
      } catch (e2: any) {
        const errorMessage2 = e2?.message || String(e2);
        console.error('Error getting push token (fallback):', e2);
        
        if (errorMessage2.includes('FirebaseApp is not initialized') || 
            errorMessage2.includes('E_REGISTRATION_FAILED') ||
            errorMessage2.includes('Make sure to complete the guide')) {
          console.error('[PUSH NOTIFICATIONS] Firebase initialization error persists.');
          console.error('Please ensure FCM credentials are configured in EAS and rebuild the app.');
        }
        return null;
      }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(token: string): Promise<boolean> {
  try {
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) {
      console.log('[PUSH NOTIFICATIONS] No auth token found, skipping device registration');
      return false;
    }

    console.log('[PUSH NOTIFICATIONS] Attempting to register device token:', {
      apiUrl: API_URL,
      platform: Platform.OS,
      tokenLength: token.length,
    });

    const response = await fetch(`${API_URL}/api/notifications/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        pushToken: token,
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('[PUSH NOTIFICATIONS] Failed to register device token:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        apiUrl: API_URL,
      });
      return false;
    }

    const result = await response.json();
    console.log('[PUSH NOTIFICATIONS] Device token registered successfully:', result);

    // Store token locally only after successful registration
    await AsyncStorage.setItem('pushToken', token);
    await AsyncStorage.setItem('pushTokenRegistered', 'true');
    return true;
  } catch (error) {
    console.error('[PUSH NOTIFICATIONS] Error registering device token:', {
      error: error instanceof Error ? error.message : String(error),
      apiUrl: API_URL,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

/**
 * Unregister device token from backend
 */
export async function unregisterDeviceToken(): Promise<boolean> {
  try {
    const authToken = await AsyncStorage.getItem('token');
    const pushToken = await AsyncStorage.getItem('pushToken');
    
    if (!authToken || !pushToken) {
      console.log('[PUSH NOTIFICATIONS] No auth token or push token found for unregistration');
      return false;
    }

    console.log('[PUSH NOTIFICATIONS] Unregistering device token');
    const response = await fetch(`${API_URL}/api/notifications/unregister-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        pushToken,
      }),
    });

    if (response.ok) {
      await AsyncStorage.removeItem('pushToken');
      await AsyncStorage.removeItem('pushTokenRegistered');
      console.log('[PUSH NOTIFICATIONS] Device token unregistered successfully');
      return true;
    }
    console.error('[PUSH NOTIFICATIONS] Failed to unregister device token:', response.status);
    return false;
  } catch (error) {
    console.error('[PUSH NOTIFICATIONS] Error unregistering device token:', error);
    return false;
  }
}

/**
 * Initialize push notifications
 * Call this when user logs in
 * Always attempts registration to ensure token is saved on server
 */
export async function initializePushNotifications(): Promise<void> {
  try {
    console.log('[PUSH NOTIFICATIONS] Initializing push notifications...');
    console.log('[PUSH NOTIFICATIONS] API URL:', API_URL);
    
    // Request permissions and get token
    const token = await registerForPushNotificationsAsync();
    if (!token) {
      console.log('[PUSH NOTIFICATIONS] No push token obtained, skipping registration');
      return;
    }

    // Check if this exact token was already successfully registered
    const storedToken = await AsyncStorage.getItem('pushToken');
    const isRegistered = await AsyncStorage.getItem('pushTokenRegistered');
    
    if (storedToken === token && isRegistered === 'true') {
      console.log('[PUSH NOTIFICATIONS] Token already registered, verifying with server...');
      // Still attempt registration to ensure it's in the database
      // The server will update if it exists or create if it doesn't
    }

    // Always attempt registration to ensure token is saved on server
    // This handles cases where:
    // 1. Token was stored locally but registration failed
    // 2. Token changed but wasn't updated
    // 3. Database was cleared or token was deleted
    const success = await registerDeviceToken(token);
    
    if (!success) {
      console.error('[PUSH NOTIFICATIONS] Failed to register device token. Will retry on next login.');
      // Clear the registered flag so we try again next time
      await AsyncStorage.removeItem('pushTokenRegistered');
    }
  } catch (error) {
    console.error('[PUSH NOTIFICATIONS] Error initializing push notifications:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Setup notification listeners
 * Returns cleanup function
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
): () => void {
  // Listener for notifications received while app is foregrounded
  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received while the app is running.:', notification);
    onNotificationReceived?.(notification);
  });

  // Listener for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped  user interacts with a notification:', response);
    onNotificationTapped?.(response);
  });

  // Return cleanup function
  return () => {
    // Subscriptions expose a remove() method for cleanup
    receivedListener.remove();
    responseListener.remove();
  };
}

/**
 * Get notification badge count from device
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

