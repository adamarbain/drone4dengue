import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchCurrentUser } from '../utils/userApi';
import { isTablet, getHorizontalPadding, moderateScale } from '../utils/responsive';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  companyId?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // const showLoader = useMinimumLoadingTime(loading, 1000);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  const handleLogout = useCallback(async () => {
    // Unregister push notifications
    try {
      const { unregisterDeviceToken, clearAllNotifications } = require('../utils/pushNotifications');
      await unregisterDeviceToken();
      await clearAllNotifications();
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
    
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('token_exp');
    router.replace('/(auth)/login');
  }, [router]);

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    handleLogout();
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Fetch user on initial load and when screen is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const wasInitialLoad = isInitialLoad;
      
      // Only show loading spinner on initial load for smoother transitions
      if (wasInitialLoad) {
        setLoading(true);
      }
      
      fetchCurrentUser()
        .then(user => {
          if (isMounted) {
            setUser(user);
            console.log('[DEBUG] User fetched:', user);
            setIsInitialLoad(false);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.log('[DEBUG] fetchCurrentUser error:', err);
          if (isMounted) {
            // Only logout on actual errors during initial load
            if (wasInitialLoad) {
              handleLogout();
            } else {
              setLoading(false);
            }
          }
        });

      return () => {
        isMounted = false;
      };
    }, [isInitialLoad, handleLogout])
  );

  const formatPhoneDisplay = (phone: string | null | undefined) => {
    if (!phone) return 'Not set';
    // Mask middle digits for privacy
    if (phone.length > 6) {
      return phone.slice(0, 4) + '****' + phone.slice(-4);
    }
    return phone;
  };

  const formatEmailDisplay = (email: string | null | undefined) => {
    if (!email) return 'Not set';
    // Mask part of email for privacy
    const [localPart, domain] = email.split('@');
    if (localPart && domain && localPart.length > 2) {
      return localPart.slice(0, 2) + '***@' + domain;
    }
    return email;
  };

  // if (showLoader) {
  //   return (
  //     <FullScreenLoader
  //       title="Loading your profile..."
  //       subtitle="Fetching your account information and settings"
  //     />
  //   );
  // }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ 
          paddingBottom: 100,
          alignItems: isTablet() ? 'center' : undefined,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ 
          width: '100%', 
          maxWidth: isTablet() ? 600 : undefined,
          paddingHorizontal: isTablet() ? getHorizontalPadding() : 24,
        }}>
          {/* Header */}
          <View className="pt-10 pb-2">
            <Text 
              className="font-extrabold mb-1" 
              style={{ 
                fontFamily: 'SF Pro', 
                color: '#0F2854',
                fontSize: isTablet() ? 42 : 36,
              }}
            >
              Profile
            </Text>
            <Text 
              className="mb-4" 
              style={{ 
                color: 'rgba(15, 40, 84, 0.75)',
                fontSize: isTablet() ? 16 : 14,
              }}
            >
              Manage your account settings and personal information
            </Text>
            <Text 
              className="font-semibold mb-2" 
              style={{ 
                color: '#0F2854',
                fontSize: isTablet() ? 18 : 16,
              }}
            >
              Welcome back, {user?.username || ''}!
            </Text>
          </View>

          {/* User Card */}
          <View 
            className="bg-[#1C4D8D] rounded-2xl shadow-lg flex-row items-center mb-6"
            style={{ padding: isTablet() ? 20 : 16 }}
          >
            <View 
              className="rounded-full overflow-hidden border-4 border-white mr-4"
              style={{ width: isTablet() ? 80 : 64, height: isTablet() ? 80 : 64 }}
            >
              <Image source={require('../assets/profile-user-image.png')} className="w-full h-full" resizeMode="cover" />
            </View>
            <View className="flex-1">
              <Text 
                className="font-bold text-white" 
                style={{ fontFamily: 'SF Pro', fontSize: isTablet() ? 22 : 18 }}
              >
                {user?.name || ''}
              </Text>
              <Text 
                className="text-[#D7D7D7]" 
                style={{ fontFamily: 'SF Pro', fontSize: isTablet() ? 14 : 12 }}
              >
                @{user?.username || ''}
              </Text>
            <View className="flex-row items-center mt-1">
              {user?.status === 'Verified' ? (
                <View className="flex-row items-center bg-green-500/20 px-2 py-1 rounded-full">
                  <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
                  <Text className="text-xs text-[#4ADE80] font-semibold ml-1" style={{ fontFamily: 'SF Pro' }}>Verified</Text>
                </View>
              ) : (
                <View className="flex-row items-center bg-yellow-500/20 px-2 py-1 rounded-full">
                  <Ionicons name="time-outline" size={14} color="#FBBF24" />
                  <Text className="text-xs text-[#FBBF24] font-semibold ml-1" style={{ fontFamily: 'SF Pro' }}>Pending</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={confirmLogout}
            className="ml-2 flex-row items-center px-3 h-10 rounded-full bg-white"
            style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
          >
            <Ionicons name="log-out-outline" size={isTablet() ? 26 : 22} color="#1C4D8D" />
            <Text 
              className="ml-2 font-bold" 
              style={{ color: '#1C4D8D', fontSize: isTablet() ? 16 : 14 }}
            >
              Log Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Options */}
        <View className="space-y-5">

          {/* Verify Account - Email OTP */}
          {user?.status !== 'Verified' && (
            <TouchableOpacity
              onPress={() => router.push('/verify-otp')}
              className="flex-row items-center bg-white rounded-2xl shadow mb-4 border-2"
              style={{ borderColor: '#F59E0B', padding: isTablet() ? 24 : 20 }}
            >
              <View 
                className="rounded-full bg-yellow-100 items-center justify-center mr-4"
                style={{ width: isTablet() ? 56 : 48, height: isTablet() ? 56 : 48 }}
              >
                <Ionicons name="mail-outline" size={isTablet() ? 30 : 26} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text 
                  className="font-semibold" 
                  style={{ color: '#0F2854', fontSize: isTablet() ? 20 : 18 }}
                >
                  Verify Account
                </Text>
                <Text 
                  style={{ color: 'rgba(15, 40, 84, 0.6)', fontSize: isTablet() ? 14 : 12 }}
                >
                  Verify your email address via OTP
                </Text>
              </View>
              <View className="bg-yellow-100 px-2 py-1 rounded-full">
                <Text 
                  className="text-yellow-700 font-semibold"
                  style={{ fontSize: isTablet() ? 14 : 12 }}
                >
                  Required
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* My Account */}
          <TouchableOpacity 
            onPress={() => router.push('/edit-profile')} 
            className="flex-row items-center bg-white rounded-2xl shadow mb-4 border" 
            style={{ borderColor: '#4988C4', padding: isTablet() ? 24 : 20 }}
          >
            <View 
              className="rounded-full bg-white items-center justify-center mr-4"
              style={{ width: isTablet() ? 56 : 48, height: isTablet() ? 56 : 48 }}
            >
              <Ionicons name="person-outline" size={isTablet() ? 30 : 26} color="#4988C4" />
            </View>
            <View className="flex-1">
              <Text 
                className="font-semibold" 
                style={{ color: '#0F2854', fontSize: isTablet() ? 20 : 18 }}
              >
                My Account
              </Text>
              <Text 
                style={{ color: 'rgba(15, 40, 84, 0.6)', fontSize: isTablet() ? 14 : 12 }}
              >
                Update name, username, and address
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={isTablet() ? 24 : 20} color="#4988C4" />
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity 
            onPress={() => router.push('/change-password')} 
            className="flex-row items-center bg-white rounded-2xl shadow mb-4 border" 
            style={{ borderColor: '#4988C4', padding: isTablet() ? 24 : 20 }}
          >
            <View 
              className="rounded-full bg-white items-center justify-center mr-4"
              style={{ width: isTablet() ? 56 : 48, height: isTablet() ? 56 : 48 }}
            >
              <Ionicons name="lock-closed-outline" size={isTablet() ? 30 : 26} color="#4988C4" />
            </View>
            <View className="flex-1">
              <Text 
                className="font-semibold" 
                style={{ color: '#0F2854', fontSize: isTablet() ? 20 : 18 }}
              >
                Change Password
              </Text>
              <Text 
                style={{ color: 'rgba(15, 40, 84, 0.6)', fontSize: isTablet() ? 14 : 12 }}
              >
                Update your account password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={isTablet() ? 24 : 20} color="#4988C4" />
          </TouchableOpacity>

          {/* Organisation Details - Hidden for companyId = comp-999 */}
          {user?.companyId !== 'comp-999' && (
            <TouchableOpacity 
              onPress={() => router.push('/organisation-details')}
              className="flex-row items-center bg-white rounded-2xl shadow mb-4 border" 
              style={{ borderColor: '#4988C4', padding: isTablet() ? 24 : 20 }}
            >
              <View 
                className="rounded-full bg-white items-center justify-center mr-4"
                style={{ width: isTablet() ? 56 : 48, height: isTablet() ? 56 : 48 }}
              >
                <Ionicons name="shield-checkmark-outline" size={isTablet() ? 30 : 26} color="#4988C4" />
              </View>
              <View className="flex-1">
                <Text 
                  className="font-semibold" 
                  style={{ color: '#0F2854', fontSize: isTablet() ? 20 : 18 }}
                >
                  Organisation Details
                </Text>
                <Text 
                  style={{ color: 'rgba(15, 40, 84, 0.6)', fontSize: isTablet() ? 14 : 12 }}
                >
                  View details about your organisation
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={isTablet() ? 24 : 20} color="#4988C4" />
            </TouchableOpacity>
          )}

          {/* About App */}
          <TouchableOpacity 
            onPress={() => router.push('/about')}
            className="flex-row items-center bg-white rounded-2xl shadow mb-4 border" 
            style={{ borderColor: '#4988C4', padding: isTablet() ? 24 : 20 }}
          >
            <View 
              className="rounded-full bg-white items-center justify-center mr-4"
              style={{ width: isTablet() ? 56 : 48, height: isTablet() ? 56 : 48 }}
            >
              <Ionicons name="information-circle-outline" size={isTablet() ? 30 : 26} color="#4988C4" />
            </View>
            <View className="flex-1">
              <Text 
                className="font-semibold" 
                style={{ color: '#0F2854', fontSize: isTablet() ? 20 : 18 }}
              >
                About App
              </Text>
              <Text 
                style={{ color: 'rgba(15, 40, 84, 0.6)', fontSize: isTablet() ? 14 : 12 }}
              >
                Disclaimer, data sources & more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={isTablet() ? 24 : 20} color="#4988C4" />
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
                <Ionicons name="log-out-outline" size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-center" style={{ color: '#0F2854' }}>Log Out</Text>
              <Text className="text-sm text-center mt-2" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
                Are you sure you want to log out of your account?
              </Text>
            </View>
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={handleCancelLogout}
                className="flex-1 py-3 rounded-xl bg-gray-100"
              >
                <Text className="text-center font-semibold" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmLogout}
                className="flex-1 py-3 rounded-xl bg-red-500"
              >
                <Text className="text-center font-semibold text-white">Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
