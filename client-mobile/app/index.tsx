import { Text, View, Image } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let timer: number;
    
    const checkAuthAndRedirect = async () => {
      // Check if user is already authenticated
      const token = await AsyncStorage.getItem('token');
      const tokenExp = await AsyncStorage.getItem('token_exp');
      
      let isAuthenticated = false;
      if (token && tokenExp) {
        const now = Date.now();
        const expTime = parseInt(tokenExp, 10);
        if (now < expTime) {
          isAuthenticated = true;
        }
      }
      
      timer = setTimeout(() => {
        if (isAuthenticated) {
          console.log('[INDEX] User is authenticated, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          console.log('[INDEX] User not authenticated, redirecting to login');
          router.replace('/(auth)/login');
        }
      }, 5000); // 5 seconds
    };
    
    checkAuthAndRedirect();
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#0F2854] items-center justify-center">
      <View className="items-center justify-center w-full">
        <Image
          source={require('../assets/dengueeye_logo.png')}
          className="mb-2"
          style={{ width: '30%', aspectRatio: 1, resizeMode: 'contain', maxWidth: 150 }}
        />
        <Text className="text-white text-center font-extrabold text-4xl leading-tight tracking-tight">
          DengueEye
        </Text>
        <Text className="text-white text-center font-medium text-sm leading-tight tracking-tight">
          v1.0.7
        </Text>
      </View>
    </SafeAreaView>
  );
}