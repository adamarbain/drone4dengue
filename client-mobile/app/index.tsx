import { Text, View, Image } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 5000); // 5 seconds
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#7D0A0A] items-center justify-center">
      <View className="items-center justify-center w-full">
        <Image
          source={require('../assets/dengueeye_logo.png')}
          className="mb-4"
          style={{ width: '30%', aspectRatio: 1, resizeMode: 'contain', maxWidth: 150 }}
        />
        <Text className="text-white text-center font-extrabold text-4xl leading-tight tracking-tight">
          DengueEye
        </Text>
      </View>
    </SafeAreaView>
  );
}
