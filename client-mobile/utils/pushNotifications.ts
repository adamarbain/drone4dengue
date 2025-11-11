import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

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
 * Request notification permissions
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
    
    try {
      // Use Constants.expoConfig?.extra?.eas?.projectId if available, otherwise use a fallback
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = tokenData.data;
      console.log('Push token:', token);
    } catch (e) {
      console.error('Error getting push token:', e);
      // Try without projectId as fallback
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        token = tokenData.data;
        console.log('Push token (fallback):', token);
      } catch (e2) {
        console.error('Error getting push token (fallback):', e2);
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
      console.log('No auth token found, skipping device registration');
      return false;
    }

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
      const error = await response.json().catch(() => ({}));
      console.error('Failed to register device token:', error);
      return false;
    }

    // Store token locally to avoid re-registering
    await AsyncStorage.setItem('pushToken', token);
    console.log('Device token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering device token:', error);
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
      return false;
    }

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
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unregistering device token:', error);
    return false;
  }
}

/**
 * Initialize push notifications
 * Call this when user logs in
 */
export async function initializePushNotifications(): Promise<void> {
  try {
    // Check if already registered
    const storedToken = await AsyncStorage.getItem('pushToken');
    if (storedToken) {
      console.log('Push token already registered');
      return;
    }

    // Request permissions and get token
    const token = await registerForPushNotificationsAsync();
    if (token) {
      // Register with backend
      await registerDeviceToken(token);
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
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
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  // Listener for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
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

