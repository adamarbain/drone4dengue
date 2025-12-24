import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomNav from './components/BottomNav';

export default function ActionPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pt-10 pb-20">
        <Text className="text-4xl font-extrabold text-black mb-2" style={{ fontFamily: 'SF Pro' }}>
          Action
        </Text>
        <Text className="text-sm text-gray-600">
          Get preventive recommendations based on dengue risk levels
        </Text>
      </View>

      {/* Action Cards */}
      <View className="flex-1 justify-top items-center">
        <View className="w-full px-4 flex-col gap-y-4">
          {/* High Risk */}
          <TouchableOpacity onPress={() => router.push({ pathname: '/recommendations', params: { risk: 'high' } })}>
            <View className="bg-[#BF3131] rounded-2xl flex-row items-center px-6 py-2">
              <Image source={require('../assets/high-risk.png')} className="w-32 h-32 mr-6" resizeMode="contain" />
              <View className="flex-1 justify-center">
                <Text className="text-xl font-bold text-white text-right leading-tight">
                  High Risk{"\n"}Recommendation
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          {/* Medium Risk */}
          <TouchableOpacity onPress={() => router.push({ pathname: '/recommendations', params: { risk: 'medium' } })}>
            <View className="bg-[#EAD196] rounded-2xl flex-row items-center px-6 py-2">
              <Image source={require('../assets/medium-risk.png')} className="w-32 h-32 mr-6" resizeMode="contain" />
              <View className="flex-1 justify-center">
                <Text className="text-xl font-bold text-black text-right leading-tight">
                  Medium Risk{"\n"}Recommendation
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          {/* Low Risk */}
          <TouchableOpacity onPress={() => router.push({ pathname: '/recommendations', params: { risk: 'low' } })}>
            <View className="bg-[#F3F3F3] rounded-2xl flex-row items-center px-6 py-2">
              <Image source={require('../assets/low-risk.png')} className="w-32 h-32 mr-6" resizeMode="contain" />
              <View className="flex-1 justify-center">
                <Text className="text-xl font-bold text-black text-right leading-tight">
                  Low Risk{"\n"}Recommendation
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
} 