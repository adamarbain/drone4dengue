import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
 * Request notification permissions and get Expo push token
 * (pattern aligned with notifications-tutorial implementation)
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('[PUSH NOTIFICATIONS] Starting push notification registration...');
  console.log('[PUSH NOTIFICATIONS] Platform:', Platform.OS);
  console.log('[PUSH NOTIFICATIONS] Device Info:', {
    isDevice: Device.isDevice,
    deviceName: Device.deviceName,
    deviceType: Device.deviceType,
    brand: Device.brand,
    modelName: Device.modelName,
  });
  console.log('[PUSH NOTIFICATIONS] App Ownership:', Constants.appOwnership);

  // Expo Go does not support remote push notifications on Android starting from SDK 53
  if (Constants.appOwnership === 'expo') {
    console.warn(
      '[PUSH NOTIFICATIONS] Push notifications are not supported in Expo Go. Use a development build instead.'
    );
    return null;
  }

  // Only physical devices can receive push notifications (emulators/simulators cannot)
  if (!Device.isDevice) {
    console.warn('[PUSH NOTIFICATIONS] Not a physical device. Must use physical device for Push Notifications.');
    console.warn('[PUSH NOTIFICATIONS] Device.isDevice:', Device.isDevice);
    return null;
  }

  // Configure Android notification channel like the tutorial
  if (Platform.OS === 'android') {
    console.log('[PUSH NOTIFICATIONS] Configuring Android notification channel...');
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#A21C1C',
        sound: 'default',
      });
      console.log('[PUSH NOTIFICATIONS] Android notification channel configured successfully');
    } catch (error) {
      console.error('[PUSH NOTIFICATIONS] Error configuring notification channel:', error);
    }
  }

  // Physical device detected, proceed with token generation
  console.log('[PUSH NOTIFICATIONS] Physical device detected, checking permissions...');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('[PUSH NOTIFICATIONS] Existing permission status:', existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    console.log('[PUSH NOTIFICATIONS] Requesting notification permissions...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('[PUSH NOTIFICATIONS] Permission request result:', status);
  }

  if (finalStatus !== 'granted') {
    console.error('[PUSH NOTIFICATIONS] Permission not granted! Status:', finalStatus);
    return null;
  }

  console.log('[PUSH NOTIFICATIONS] Permissions granted, fetching project ID...');
  const projectId =
    // Match tutorial: prefer expoConfig.extra.eas.projectId then easConfig.projectId
    Constants?.expoConfig?.extra?.eas?.projectId ??
    // Fallback for managed / EAS builds
    Constants?.easConfig?.projectId;

  console.log('[PUSH NOTIFICATIONS] Project ID lookup:', {
    fromExpoConfig: Constants?.expoConfig?.extra?.eas?.projectId,
    fromEasConfig: Constants?.easConfig?.projectId,
    finalProjectId: projectId,
  });

  if (!projectId) {
    console.error('[PUSH NOTIFICATIONS] Project ID not found in Constants. Cannot request Expo push token.');
    console.error('[PUSH NOTIFICATIONS] Available Constants keys:', Object.keys(Constants));
    if (Constants.expoConfig) {
      console.error('[PUSH NOTIFICATIONS] expoConfig keys:', Object.keys(Constants.expoConfig));
      if (Constants.expoConfig.extra) {
        console.error('[PUSH NOTIFICATIONS] expoConfig.extra keys:', Object.keys(Constants.expoConfig.extra));
      }
    }
    return null;
  }

  console.log('[PUSH NOTIFICATIONS] Requesting Expo push token with projectId:', projectId);
  try {
    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    console.log('[PUSH NOTIFICATIONS] ✅ Expo push token obtained successfully!');
    console.log('[PUSH NOTIFICATIONS] Token:', pushTokenString);
    console.log('[PUSH NOTIFICATIONS] Token length:', pushTokenString.length);
    return pushTokenString;
  } catch (e: any) {
    console.error('[PUSH NOTIFICATIONS] ❌ Error while getting Expo push token:');
    console.error('[PUSH NOTIFICATIONS] Error type:', e?.constructor?.name);
    console.error('[PUSH NOTIFICATIONS] Error message:', e?.message);
    console.error('[PUSH NOTIFICATIONS] Error code:', e?.code);
    console.error('[PUSH NOTIFICATIONS] Full error object:', JSON.stringify(e, null, 2));
    if (e?.stack) {
      console.error('[PUSH NOTIFICATIONS] Stack trace:', e.stack);
    }
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(token: string): Promise<boolean> {
  try {
    console.log('[PUSH NOTIFICATIONS] Starting device token registration...');
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) {
      console.warn('[PUSH NOTIFICATIONS] No auth token found, skipping device registration');
      return false;
    }

    const requestPayload = {
      pushToken: token,
      platform: Platform.OS,
    };

    console.log('[PUSH NOTIFICATIONS] Registering device token with backend:', {
      apiUrl: API_URL,
      endpoint: '/api/notifications/register-device',
      platform: Platform.OS,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
      authTokenLength: authToken.length,
      authTokenPrefix: authToken.substring(0, 20) + '...',
    });

    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/notifications/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const responseTime = Date.now() - startTime;
    console.log('[PUSH NOTIFICATIONS] Backend response received:', {
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('[PUSH NOTIFICATIONS] ❌ Failed to register device token:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        apiUrl: API_URL,
        requestPayload,
      });
      return false;
    }

    const result = await response.json();
    console.log('[PUSH NOTIFICATIONS] ✅ Device token registered successfully!');
    console.log('[PUSH NOTIFICATIONS] Backend response:', JSON.stringify(result, null, 2));

    // Store token locally only after successful registration
    await AsyncStorage.setItem('pushToken', token);
    await AsyncStorage.setItem('pushTokenRegistered', 'true');
    console.log('[PUSH NOTIFICATIONS] Token stored in AsyncStorage');
    return true;
  } catch (error) {
    console.error('[PUSH NOTIFICATIONS] ❌ Error registering device token:');
    console.error('[PUSH NOTIFICATIONS] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[PUSH NOTIFICATIONS] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[PUSH NOTIFICATIONS] API URL:', API_URL);
    if (error instanceof Error && error.stack) {
      console.error('[PUSH NOTIFICATIONS] Stack trace:', error.stack);
    }
    console.error('[PUSH NOTIFICATIONS] Full error:', error);
    return false;
  }
}

/**
 * Unregister device token from backend
 */
export async function unregisterDeviceToken(): Promise<boolean> {
  try {
    console.log('[PUSH NOTIFICATIONS] Starting device token unregistration...');
    const authToken = await AsyncStorage.getItem('token');
    const pushToken = await AsyncStorage.getItem('pushToken');
    
    if (!authToken || !pushToken) {
      console.warn('[PUSH NOTIFICATIONS] No auth token or push token found for unregistration:', {
        hasAuthToken: !!authToken,
        hasPushToken: !!pushToken,
      });
      return false;
    }

    console.log('[PUSH NOTIFICATIONS] Unregistering device token:', {
      apiUrl: API_URL,
      endpoint: '/api/notifications/unregister-device',
      tokenLength: pushToken.length,
      tokenPrefix: pushToken.substring(0, 20) + '...',
    });

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

    console.log('[PUSH NOTIFICATIONS] Unregistration response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (response.ok) {
      await AsyncStorage.removeItem('pushToken');
      await AsyncStorage.removeItem('pushTokenRegistered');
      console.log('[PUSH NOTIFICATIONS] ✅ Device token unregistered successfully');
      console.log('[PUSH NOTIFICATIONS] Local token storage cleared');
      return true;
    }
    
    const errorText = await response.text();
    console.error('[PUSH NOTIFICATIONS] ❌ Failed to unregister device token:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    return false;
  } catch (error) {
    console.error('[PUSH NOTIFICATIONS] ❌ Error unregistering device token:');
    console.error('[PUSH NOTIFICATIONS] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[PUSH NOTIFICATIONS] Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[PUSH NOTIFICATIONS] Stack trace:', error.stack);
    }
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
    console.log('[PUSH NOTIFICATIONS] ========================================');
    console.log('[PUSH NOTIFICATIONS] Initializing push notifications...');
    console.log('[PUSH NOTIFICATIONS] API URL:', API_URL);
    console.log('[PUSH NOTIFICATIONS] Platform:', Platform.OS);
    console.log('[PUSH NOTIFICATIONS] Timestamp:', new Date().toISOString());
    
    // Early exit: Expo Go does not support push notifications
    if (Constants.appOwnership === 'expo') {
      console.warn('[PUSH NOTIFICATIONS] ⚠️ Skipping push notification initialization: Running in Expo Go');
      console.warn('[PUSH NOTIFICATIONS] Push notifications are not supported in Expo Go. Use a development build instead.');
      console.log('[PUSH NOTIFICATIONS] ========================================');
      return;
    }

    // Early exit: Emulators/simulators cannot receive push notifications
    if (!Device.isDevice) {
      console.warn('[PUSH NOTIFICATIONS] ⚠️ Skipping push notification initialization: Running in emulator/simulator');
      console.warn('[PUSH NOTIFICATIONS] Must use physical device for Push Notifications.');
      console.log('[PUSH NOTIFICATIONS] ========================================');
      return;
    }
    
    // Check stored token status
    const storedToken = await AsyncStorage.getItem('pushToken');
    const isRegistered = await AsyncStorage.getItem('pushTokenRegistered');
    console.log('[PUSH NOTIFICATIONS] Stored token status:', {
      hasStoredToken: !!storedToken,
      storedTokenLength: storedToken?.length || 0,
      isRegistered: isRegistered === 'true',
    });
    
    // Request permissions and get token
    console.log('[PUSH NOTIFICATIONS] Step 1: Requesting push notification token...');
    const token = await registerForPushNotificationsAsync();
    if (!token) {
      console.error('[PUSH NOTIFICATIONS] ❌ No push token obtained, skipping registration');
      console.log('[PUSH NOTIFICATIONS] ========================================');
      return;
    }

    // Check if this exact token was already successfully registered
    if (storedToken === token && isRegistered === 'true') {
      console.log('[PUSH NOTIFICATIONS] Token matches stored token and is marked as registered');
      console.log('[PUSH NOTIFICATIONS] Still verifying with server to ensure it exists in database...');
    } else if (storedToken && storedToken !== token) {
      console.log('[PUSH NOTIFICATIONS] ⚠️ Token changed! Old token:', storedToken.substring(0, 20) + '...');
      console.log('[PUSH NOTIFICATIONS] New token:', token.substring(0, 20) + '...');
    } else if (!storedToken) {
      console.log('[PUSH NOTIFICATIONS] No stored token found, this is a new registration');
    }

    // Always attempt registration to ensure token is saved on server
    // This handles cases where:
    // 1. Token was stored locally but registration failed
    // 2. Token changed but wasn't updated
    // 3. Database was cleared or token was deleted
    console.log('[PUSH NOTIFICATIONS] Step 2: Registering token with backend...');
    const success = await registerDeviceToken(token);
    
    if (!success) {
      console.error('[PUSH NOTIFICATIONS] ❌ Failed to register device token. Will retry on next login.');
      // Clear the registered flag so we try again next time
      await AsyncStorage.removeItem('pushTokenRegistered');
      console.log('[PUSH NOTIFICATIONS] Cleared pushTokenRegistered flag for retry');
    } else {
      console.log('[PUSH NOTIFICATIONS] ✅ Push notifications initialized successfully!');
    }
    console.log('[PUSH NOTIFICATIONS] ========================================');
  } catch (error) {
    console.error('[PUSH NOTIFICATIONS] ❌ Error initializing push notifications:');
    console.error('[PUSH NOTIFICATIONS] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[PUSH NOTIFICATIONS] Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[PUSH NOTIFICATIONS] Stack trace:', error.stack);
    }
    console.error('[PUSH NOTIFICATIONS] Full error:', error);
    console.log('[PUSH NOTIFICATIONS] ========================================');
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
  console.log('[PUSH NOTIFICATIONS] Setting up notification listeners...');
  
  // Listener for notifications received while app is foregrounded
  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[PUSH NOTIFICATIONS] 🔔 Notification received while app is running:');
    console.log('[PUSH NOTIFICATIONS] Notification ID:', notification.request.identifier);
    console.log('[PUSH NOTIFICATIONS] Title:', notification.request.content.title);
    console.log('[PUSH NOTIFICATIONS] Body:', notification.request.content.body);
    console.log('[PUSH NOTIFICATIONS] Data:', JSON.stringify(notification.request.content.data, null, 2));
    onNotificationReceived?.(notification);
  });

  // Listener for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[PUSH NOTIFICATIONS] 👆 Notification tapped by user:');
    console.log('[PUSH NOTIFICATIONS] Notification ID:', response.notification.request.identifier);
    console.log('[PUSH NOTIFICATIONS] Title:', response.notification.request.content.title);
    console.log('[PUSH NOTIFICATIONS] Body:', response.notification.request.content.body);
    console.log('[PUSH NOTIFICATIONS] Data:', JSON.stringify(response.notification.request.content.data, null, 2));
    console.log('[PUSH NOTIFICATIONS] Action Identifier:', response.actionIdentifier);
    onNotificationTapped?.(response);
  });

  console.log('[PUSH NOTIFICATIONS] ✅ Notification listeners set up successfully');

  // Return cleanup function
  return () => {
    console.log('[PUSH NOTIFICATIONS] Cleaning up notification listeners...');
    // Subscriptions expose a remove() method for cleanup
    receivedListener.remove();
    responseListener.remove();
    console.log('[PUSH NOTIFICATIONS] Notification listeners removed');
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

