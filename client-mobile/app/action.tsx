import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from './components/BottomNav';
import { isTablet, getHorizontalPadding, moderateScale } from '../utils/responsive';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function ActionPage() {
  const router = useRouter();
  const [counts, setCounts] = useState({ high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(true);
  // const showLoader = useMinimumLoadingTime(loading, 1000);
  const tablet = isTablet();

  useEffect(() => {
    // Fetch recommendation counts for each risk level
    const fetchCounts = async () => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  const cardImageSize = tablet ? 160 : 128;
  const cardTitleSize = tablet ? 24 : 18;
  const cardTipSize = tablet ? 16 : 12;
  const iconSize = tablet ? 18 : 14;

  // if (showLoader) {
  //   return (
  //     <FullScreenLoader
  //       title="Loading action recommendations..."
  //       subtitle="Preparing preventive measures for all risk levels"
  //     />
  //   );
  // }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ 
          paddingBottom: 100,
          alignItems: tablet ? 'center' : undefined,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Content Container for Tablet Centering */}
        <View style={{ 
          width: '100%', 
          maxWidth: tablet ? 700 : undefined,
          paddingHorizontal: tablet ? getHorizontalPadding() : 0,
        }}>
          {/* Header */}
          <View className="px-6 pt-10 pb-4">
            <Text 
              className="font-extrabold text-black mb-2" 
              style={{ fontFamily: 'SF Pro', fontSize: tablet ? 44 : 36 }}
            >
              Action
            </Text>
            <Text style={{ fontSize: tablet ? 16 : 14, color: '#6B7280' }}>
              Get preventive recommendations based on dengue risk levels
            </Text>
          </View>

          {/* Action Cards */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            {/* High Risk */}
            <TouchableOpacity 
              onPress={() => router.push({ pathname: '/recommendations', params: { risk: 'high' } })}
              activeOpacity={0.8}
              style={{ marginBottom: 16 }}
            >
              <View 
                className="bg-[#BF3131] rounded-2xl flex-row items-center"
                style={{ 
                  paddingHorizontal: tablet ? 32 : 24, 
                  paddingVertical: tablet ? 20 : 16,
                  minHeight: tablet ? 160 : 128,
                }}
              >
                <Image 
                  source={require('../assets/high-risk.png')} 
                  style={{ width: cardImageSize, height: cardImageSize, marginRight: tablet ? 32 : 24 }}
                  resizeMode="contain" 
                />
                <View className="flex-1 justify-center">
                  <Text 
                    className="font-bold text-white text-right leading-tight"
                    style={{ fontSize: cardTitleSize }}
                  >
                    High Risk{"\n"}Recommendation
                  </Text>
                  {counts.high > 0 && (
                    <View className="flex-row items-center justify-end mt-2">
                      <Ionicons name="document-text-outline" size={iconSize} color="rgba(255,255,255,0.8)" />
                      <Text style={{ fontSize: cardTipSize }} className="text-white/80 ml-1">{counts.high} tips</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Medium Risk */}
            <TouchableOpacity 
              onPress={() => router.push({ pathname: '/recommendations', params: { risk: 'medium' } })}
              activeOpacity={0.8}
              style={{ marginBottom: 16 }}
            >
              <View 
                className="bg-[#EAD196] rounded-2xl flex-row items-center"
                style={{ 
                  paddingHorizontal: tablet ? 32 : 24, 
                  paddingVertical: tablet ? 20 : 16,
                  minHeight: tablet ? 160 : 128,
                }}
              >
                <Image 
                  source={require('../assets/medium-risk.png')} 
                  style={{ width: cardImageSize, height: cardImageSize, marginRight: tablet ? 32 : 24 }}
                  resizeMode="contain" 
                />
                <View className="flex-1 justify-center">
                  <Text 
                    className="font-bold text-black text-right leading-tight"
                    style={{ fontSize: cardTitleSize }}
                  >
                    Medium Risk{"\n"}Recommendation
                  </Text>
                  {counts.medium > 0 && (
                    <View className="flex-row items-center justify-end mt-2">
                      <Ionicons name="document-text-outline" size={iconSize} color="rgba(0,0,0,0.6)" />
                      <Text style={{ fontSize: cardTipSize }} className="text-black/60 ml-1">{counts.medium} tips</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Low Risk */}
            <TouchableOpacity 
              onPress={() => router.push({ pathname: '/recommendations', params: { risk: 'low' } })}
              activeOpacity={0.8}
            >
              <View 
                className="bg-[#F3F3F3] rounded-2xl flex-row items-center"
                style={{ 
                  paddingHorizontal: tablet ? 32 : 24, 
                  paddingVertical: tablet ? 20 : 16,
                  minHeight: tablet ? 160 : 128,
                }}
              >
                <Image 
                  source={require('../assets/low-risk.png')} 
                  style={{ width: cardImageSize, height: cardImageSize, marginRight: tablet ? 32 : 24 }}
                  resizeMode="contain" 
                />
                <View className="flex-1 justify-center">
                  <Text 
                    className="font-bold text-black text-right leading-tight"
                    style={{ fontSize: cardTitleSize }}
                  >
                    Low Risk{"\n"}Recommendation
                  </Text>
                  {counts.low > 0 && (
                    <View className="flex-row items-center justify-end mt-2">
                      <Ionicons name="document-text-outline" size={iconSize} color="rgba(0,0,0,0.6)" />
                      <Text style={{ fontSize: cardTipSize }} className="text-black/60 ml-1">{counts.low} tips</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
} 