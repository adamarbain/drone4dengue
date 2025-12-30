import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from './components/BottomNav';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function ActionPage() {
  const router = useRouter();
  const [counts, setCounts] = useState({ high: 0, medium: 0, low: 0 });

  useEffect(() => {
    // Fetch recommendation counts for each risk level
    const fetchCounts = async () => {
      try {
        const [highRes, mediumRes, lowRes] = await Promise.all([
          fetch(`${API_URL}/recommendations/high`),
          fetch(`${API_URL}/recommendations/medium`),
          fetch(`${API_URL}/recommendations/low`)
        ]);
        const [high, medium, low] = await Promise.all([
          highRes.json(),
          mediumRes.json(),
          lowRes.json()
        ]);
        setCounts({
          high: Array.isArray(high) ? high.length : 0,
          medium: Array.isArray(medium) ? medium.length : 0,
          low: Array.isArray(low) ? low.length : 0
        });
      } catch (error) {
        console.error('Failed to fetch recommendation counts:', error);
      }
    };
    fetchCounts();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pt-10 pb-8">
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
                {counts.high > 0 && (
                  <View className="flex-row items-center justify-end mt-2">
                    <Ionicons name="document-text-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text className="text-sm text-white/80 ml-1">{counts.high} tips</Text>
                  </View>
                )}
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
                {counts.medium > 0 && (
                  <View className="flex-row items-center justify-end mt-2">
                    <Ionicons name="document-text-outline" size={14} color="rgba(0,0,0,0.6)" />
                    <Text className="text-sm text-black/60 ml-1">{counts.medium} tips</Text>
                  </View>
                )}
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
                {counts.low > 0 && (
                  <View className="flex-row items-center justify-end mt-2">
                    <Ionicons name="document-text-outline" size={14} color="rgba(0,0,0,0.6)" />
                    <Text className="text-sm text-black/60 ml-1">{counts.low} tips</Text>
                  </View>
                )}
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