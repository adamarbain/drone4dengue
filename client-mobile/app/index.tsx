import { Text, View, Image } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#7D0A0A] items-center justify-center" style={{ paddingTop: 0 }}>
      <View className="items-center justify-center w-full" style={{ paddingTop: 120 }}>
        <Image
          source={require('../assets/dengueeye_logo.png')}
          style={{ width: 121, height: 122, resizeMode: 'contain', marginBottom: 40 }}
        />
        <Text className="text-white text-center font-extrabold" style={{ fontSize: 40, letterSpacing: -1, lineHeight: 52 }}>
          DengueEye
        </Text>
      </View>
    </SafeAreaView>
  );
}
