import { Slot, Stack } from "expo-router";
import './globals.css';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupNotificationListeners, initializePushNotifications, setBadgeCount } from '../utils/pushNotifications';
import { getUnreadNotificationCount } from '../utils/userApi';
import ErrorBoundary from '../components/ErrorBoundary';
import MedicalDisclaimerModal from '../components/MedicalDisclaimerModal';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

export default function AppLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  // const showLoader = useMinimumLoadingTime(!isAuthChecked, 2000);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('[AUTH] Checking authentication status...');
      const token = await AsyncStorage.getItem('token');
      const tokenExp = await AsyncStorage.getItem('token_exp');
      const inAuthGroup = segments[0] as string === '(auth)';
      
      console.log('[AUTH] Token status:', {
        hasToken: !!token,
        hasTokenExp: !!tokenExp,
        tokenExpValue: tokenExp,
        inAuthGroup,
        currentSegment: segments[0],
      });
      
      let isValid = false;
      if (token && tokenExp) {
        const now = Date.now();
        const expTime = parseInt(tokenExp, 10);
        const timeUntilExpiry = expTime - now;
        const daysUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60 * 24));
        
        console.log('[AUTH] Token expiration check:', {
          now,
          expTime,
          timeUntilExpiry,
          daysUntilExpiry,
          isValid: now < expTime,
        });
        
        if (now < expTime) {
          isValid = true;
          console.log('[AUTH] ✅ Token is valid. User is authenticated.');
        } else {
          // Token expired, remove it
          console.log('[AUTH] ❌ Token expired. Removing from storage.');
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('token_exp');
        }
      } else {
        console.log('[AUTH] ❌ No token or token_exp found.');
      }
      
      if (!isValid && !inAuthGroup) {
        console.log('[AUTH] Redirecting to login (not authenticated and not in auth group)');
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 0);
      } else if (isValid && inAuthGroup) {
        // User is authenticated but on auth screen, redirect to dashboard
        console.log('[AUTH] User is authenticated but on auth screen. Redirecting to dashboard.');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 0);
      } else if (isValid) {
        console.log('[AUTH] User is authenticated. Setting up push notifications...');
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
  }, [segments, router]);

  // if (showLoader) {
  //   return (
  //     <FullScreenLoader
  //       title="Checking your session..."
  //       subtitle="Making sure your DengueEye data is up to date"
  //     />
  //   );
  // }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <MedicalDisclaimerModal />
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
