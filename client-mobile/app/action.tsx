import React from 'react';
import { View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';

export default function ActionPage() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pt-10 pb-20">
        <Text className="text-3xl font-extrabold text-black mb-2" style={{ fontFamily: 'SF Pro' }}>
          Action
        </Text>
      </View>

      {/* Action Cards */}
      <View className="flex-1 justify-top items-center">
        <View className="w-full px-4 flex-col gap-y-4">
          {/* High Risk */}
          <View className="bg-[#BF3131] rounded-2xl flex-row items-center px-6 py-2">
            <Image source={require('../assets/high-risk.png')} className="w-32 h-32 mr-6" resizeMode="contain" />
            <View className="flex-1 justify-center">
              <Text className="text-2xl font-bold text-white text-right leading-tight">
                High Risk{"\n"}Recommendation
              </Text>
            </View>
          </View>
          {/* Medium Risk */}
          <View className="bg-[#EAD196] rounded-2xl flex-row items-center px-6 py-2">
            <Image source={require('../assets/medium-risk.png')} className="w-32 h-32 mr-6" resizeMode="contain" />
            <View className="flex-1 justify-center">
              <Text className="text-2xl font-bold text-black text-right leading-tight">
                Medium Risk{"\n"}Recommendation
              </Text>
            </View>
          </View>
          {/* Low Risk */}
          <View className="bg-[#F3F3F3] rounded-2xl flex-row items-center px-6 py-2">
            <Image source={require('../assets/low-risk.png')} className="w-32 h-32 mr-6" resizeMode="contain" />
            <View className="flex-1 justify-center">
              <Text className="text-2xl font-bold text-black text-right leading-tight">
                Low Risk{"\n"}Recommendation
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
} 