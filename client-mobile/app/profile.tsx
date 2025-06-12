import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchCurrentUser } from '../utils/userApi';

type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug: Check token and expiration
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      const tokenExp = await AsyncStorage.getItem('token_exp');
      console.log('[DEBUG] Token:', token);
      console.log('[DEBUG] Token Expiration:', tokenExp, 'Current Time:', Date.now());
      if (tokenExp && Date.now() > parseInt(tokenExp, 10)) {
        console.log('[DEBUG] Token is expired.');
      }
    })();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('token_exp');
    router.replace('/(auth)/login');
  };

  // Fetch user every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCurrentUser()
        .then(user => {
          setUser(user);
          console.log('[DEBUG] User fetched:', user);
        })
        .catch((err) => {
          console.log('[DEBUG] fetchCurrentUser error:', err);
          handleLogout();
        })
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F8F8] items-center justify-center">
        <ActivityIndicator size="large" color="#7D0A0A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F8F8]">
      {/* Header */}
      <View className="px-6 pt-10 pb-2">
        <Text className="text-4xl font-extrabold text-[#181D27] mb-1" style={{ fontFamily: 'SF Pro' }}>
          Profile
        </Text>
        <Text className="text-base text-[#7D0A0A] font-semibold mb-2">Welcome back, {user?.username || ''}!</Text>
      </View>

     {/* User Card */}
     <View className="mx-6 bg-[#BF3131] rounded-2xl shadow-lg flex-row items-center p-4 mb-6">
        <View className="w-16 h-16 rounded-full overflow-hidden border-4 border-white mr-4">
          <Image source={require('../assets/profile-user-image.png')} className="w-full h-full" resizeMode="cover" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-white" style={{ fontFamily: 'SF Pro' }}>{user?.name || ''}</Text>
          <Text className="text-xs text-[#D7D7D7]" style={{ fontFamily: 'SF Pro' }}>@{user?.username || ''}</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          className="ml-2 flex-row items-center px-3 h-10 rounded-full bg-white"
          style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
        >
          <Ionicons name="log-out-outline" size={22} color="#BF3131" />
          <Text className="ml-2 text-[#BF3131] font-bold text-sm">Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Options */}
      <View className="mx-6 space-y-5">
        {/* My Account */}
        <TouchableOpacity onPress={() => router.push('/edit-profile')} className="flex-row items-center bg-white rounded-2xl shadow p-5 mb-4">
          <View className="w-12 h-12 rounded-full bg-[#7D0A0A]/10 items-center justify-center mr-4">
            <Ionicons name="person-outline" size={26} color="#7D0A0A" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-[#181D27]">My Account</Text>
            <Text className="text-xs text-[#ABABAB]">Make changes to your account</Text>
          </View>
        </TouchableOpacity>
        {/* Organisation Details */}
        <View className="flex-row items-center bg-white rounded-2xl shadow p-5 mb-4">
          <View className="w-12 h-12 rounded-full bg-[#7D0A0A]/10 items-center justify-center mr-4">
            <Ionicons name="shield-checkmark-outline" size={26} color="#7D0A0A" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-[#181D27]">Organisation Details</Text>
            <Text className="text-xs text-[#ABABAB]">View details about your organisation</Text>
          </View>
        </View>
        {/* About App */}
        <View className="flex-row items-center bg-white rounded-2xl shadow p-5 mb-4">
          <View className="w-12 h-12 rounded-full bg-[#7D0A0A]/10 items-center justify-center mr-4">
            <Ionicons name="information-circle-outline" size={26} color="#7D0A0A" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-[#181D27]">About App</Text>
            <Text className="text-xs text-[#ABABAB]">Learn more about DengueEye</Text>
          </View>
        </View>
      </View>

      {/* Spacer */}
      <View className="flex-1" />

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
}