import { Slot, Stack } from "expo-router";
import './globals.css';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupNotificationListeners, initializePushNotifications, setBadgeCount } from '../utils/pushNotifications';
import { getUnreadNotificationCount } from '../utils/userApi';
import ErrorBoundary from '../components/ErrorBoundary';

export default function AppLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      const tokenExp = await AsyncStorage.getItem('token_exp');
      const inAuthGroup = segments[0] as string === '(auth)';
      let isValid = false;
      if (token && tokenExp) {
        const now = Date.now();
        if (now < parseInt(tokenExp, 10)) {
          isValid = true;
        } else {
          // Token expired, remove it
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('token_exp');
        }
      }
      if (!isValid && !inAuthGroup) {
        setTimeout(() => {
          router.replace('./login');
        }, 0);
      } else if (isValid) {
        // Initialize push notifications if user is authenticated
        (async () => {
          try {
            await initializePushNotifications();
            
            // Setup notification listeners
            setupNotificationListeners(
              async (notification) => {
                console.log('Notification received:', notification);
                // Update badge count when notification is received
                try {
                  const count = await getUnreadNotificationCount();
                  await setBadgeCount(count);
                } catch (error) {
                  console.error('Error updating badge count:', error);
                }
              },
              (response) => {
                console.log('Notification tapped:', response);
                // Navigate to notification page or specific screen based on notification data
                const data = response.notification.request.content.data;
                if (data?.type === 'prediction' || data?.type === 'daily_prediction') {
                  router.push('/dashboard');
                } else {
                  router.push('/notification');
                }
              }
            );
            
            // Update badge count on app start
            try {
              const count = await getUnreadNotificationCount();
              await setBadgeCount(count);
            } catch (error) {
              console.error('Error setting initial badge count:', error);
            }
          } catch (error) {
            console.error('Error setting up push notifications:', error);
          }
        })();
      }
      setIsAuthChecked(true);
    };
    checkAuth();
  }, [segments]);

  if (!isAuthChecked) return null; // Optionally show a splash/loading screen

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="dashboard" />
        </Stack>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
