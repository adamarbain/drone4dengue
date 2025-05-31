import { Slot, Stack } from "expo-router";
import './globals.css';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function AppLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Redirect to login if not authenticated
    const inAuthGroup = segments[0] as string === '(auth)';
    if (!inAuthGroup) {
      // Use setTimeout to ensure navigation happens after initial render
      setTimeout(() => {
        router.replace('./login');
      }, 0);
    }
  }, [segments]);

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
