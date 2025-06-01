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
      const inAuthGroup = segments[0] as string === '(auth)';
      if (!token && !inAuthGroup) {
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
