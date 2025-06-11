import { Slot, Stack } from "expo-router";
import './globals.css';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      }
      setIsAuthChecked(true);
    };
    checkAuth();
  }, [segments]);

  if (!isAuthChecked) return null; // Optionally show a splash/loading screen

  return (
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
  );
}
