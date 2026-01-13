import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchCurrentUser, getCompanyDetails } from '../utils/userApi';
import BottomNav from './components/BottomNav';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

type Company = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  alertFrequency: string;
  alertThreshold: string;
  predictionModelParameters: any;
  syncMode: string;
  advancedSettings: any;
};

export default function OrganisationDetailsPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const showLoader = useMinimumLoadingTime(loading, 1000);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setLoading(true);
      setError(null);

      const loadCompanyDetails = async () => {
        try {
          // First get the current user to get their companyId
          const user = await fetchCurrentUser();
          if (!user?.companyId) {
            throw new Error('No company associated with your account');
          }
          
          // Then fetch company details
          const companyData = await getCompanyDetails(user.companyId);
          if (isMounted) {
            setCompany(companyData);
            setLoading(false);
          }
        } catch (err: any) {
          console.error('[ORGANISATION DETAILS ERROR]', err);
          if (isMounted) {
            setError(err.message || 'Failed to load organisation details');
            setLoading(false);
          }
        }
      };

      loadCompanyDetails();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getAlertFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      immediate: 'Immediate',
      daily: 'Daily',
      weekly: 'Weekly',
    };
    return labels[frequency] || frequency;
  };

  const getAlertThresholdLabel = (threshold: string) => {
    const labels: { [key: string]: string } = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    };
    return labels[threshold] || threshold;
  };

  const getThresholdColor = (threshold: string) => {
    const colors: { [key: string]: string } = {
      low: '#22C55E',
      medium: '#F59E0B',
      high: '#EF4444',
    };
    return colors[threshold] || '#6B7280';
  };

  // if (showLoader) {
  //   return (
  //     <FullScreenLoader
  //       title="Loading organisation details..."
  //       subtitle="Fetching your company information and settings"
  //     />
  //   );
  // }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-6 pt-4 pb-2 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#BDE8F5] items-center justify-center shadow"
          >
            <Ionicons name="arrow-back" size={22} color="#4988C4" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold ml-4" style={{ color: '#0F2854' }}>Organisation Details</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          </View>
          <Text className="text-lg font-semibold text-center mb-2" style={{ color: '#0F2854' }}>
            Unable to Load Details
          </Text>
          <Text className="text-sm text-center mb-6" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>{error}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 rounded-xl bg-[#1C4D8D]"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
          <View className="px-6 pt-6 pb-4 ml-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-3xl font-extrabold" style={{ fontFamily: 'SF Pro', color: '#0F2854' }}>
                Organisation Details
              </Text>
            </View>
            <Text className="text-sm" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
              View details about your organisation
            </Text>
          </View>

        {/* Company Card */}
        <View className="mx-6 bg-[#1C4D8D] rounded-2xl shadow-lg p-5 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center mr-4">
              <Ionicons name="business" size={28} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">{company?.name}</Text>
              <View className="flex-row items-center mt-1">
                <View className="bg-white/20 px-2 py-1 rounded-full">
                  <Text className="text-xs text-white font-medium">{company?.code}</Text>
                </View>
              </View>
            </View>
          </View>
          {company?.description && (
            <Text className="text-white/80 text-sm mt-2">{company.description}</Text>
          )}
        </View>

        {/* Details Section */}
        <View className="mx-6">
          {/* Basic Information */}
          <Text className="text-lg font-bold mb-3" style={{ color: '#0F2854' }}>Basic Information</Text>
          <View className="bg-[#BDE8F5] rounded-2xl shadow p-4 mb-6 border" style={{ borderColor: '#4988C4' }}>
            <View className="flex-row items-center py-3 border-b" style={{ borderColor: '#4988C4' }}>
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                <Ionicons name="calendar-outline" size={20} color="#4988C4" />
              </View>
              <View className="flex-1">
                <Text className="text-xs" style={{ color: 'rgba(15, 40, 84, 0.6)' }}>Created On</Text>
                <Text className="text-sm font-medium" style={{ color: '#0F2854' }}>
                  {company?.createdAt ? formatDate(company.createdAt) : 'N/A'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center py-3">
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                <Ionicons name="refresh-outline" size={20} color="#4988C4" />
              </View>
              <View className="flex-1">
                <Text className="text-xs" style={{ color: 'rgba(15, 40, 84, 0.6)' }}>Last Updated</Text>
                <Text className="text-sm font-medium" style={{ color: '#0F2854' }}>
                  {company?.updatedAt ? formatDate(company.updatedAt) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Notification Settings */}
          <Text className="text-lg font-bold mb-3" style={{ color: '#0F2854' }}>Notification Settings</Text>
          <View className="bg-[#BDE8F5] rounded-2xl shadow p-4 mb-6 border" style={{ borderColor: '#4988C4' }}>
            <View className="flex-row items-center py-3 border-b" style={{ borderColor: '#4988C4' }}>
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                <Ionicons name="mail-outline" size={20} color="#4988C4" />
              </View>
              <View className="flex-1">
                <Text className="text-xs" style={{ color: 'rgba(15, 40, 84, 0.6)' }}>Email Notifications</Text>
                <Text className="text-sm font-medium" style={{ color: '#0F2854' }}>
                  {company?.emailNotifications ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <View className={`w-8 h-8 rounded-full items-center justify-center ${company?.emailNotifications ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Ionicons 
                  name={company?.emailNotifications ? "checkmark" : "close"} 
                  size={18} 
                  color={company?.emailNotifications ? "#22C55E" : "#9CA3AF"} 
                />
              </View>
            </View>
            <View className="flex-row items-center py-3 border-b" style={{ borderColor: '#4988C4' }}>
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                <Ionicons name="chatbubble-outline" size={20} color="#4988C4" />
              </View>
              <View className="flex-1">
                <Text className="text-xs" style={{ color: 'rgba(15, 40, 84, 0.6)' }}>SMS Notifications</Text>
                <Text className="text-sm font-medium" style={{ color: '#0F2854' }}>
                  {company?.smsNotifications ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <View className={`w-8 h-8 rounded-full items-center justify-center ${company?.smsNotifications ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Ionicons 
                  name={company?.smsNotifications ? "checkmark" : "close"} 
                  size={18} 
                  color={company?.smsNotifications ? "#22C55E" : "#9CA3AF"} 
                />
              </View>
            </View>
            <View className="flex-row items-center py-3">
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                <Ionicons name="time-outline" size={20} color="#4988C4" />
              </View>
              <View className="flex-1">
                <Text className="text-xs" style={{ color: 'rgba(15, 40, 84, 0.6)' }}>Alert Frequency</Text>
                <Text className="text-sm font-medium" style={{ color: '#0F2854' }}>
                  {company?.alertFrequency ? getAlertFrequencyLabel(company.alertFrequency) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* System Configuration */}
          <Text className="text-lg font-bold mb-3" style={{ color: '#0F2854' }}>System Configuration</Text>
          <View className="bg-[#BDE8F5] rounded-2xl shadow p-4 mb-6 border" style={{ borderColor: '#4988C4' }}>
            <View className="flex-row items-center py-3 border-b" style={{ borderColor: '#4988C4' }}>
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                <Ionicons name="warning-outline" size={20} color="#4988C4" />
              </View>
              <View className="flex-1">
                <Text className="text-xs" style={{ color: 'rgba(15, 40, 84, 0.6)' }}>Alert Threshold</Text>
                <Text className="text-sm font-medium" style={{ color: '#0F2854' }}>
                  {company?.alertThreshold ? getAlertThresholdLabel(company.alertThreshold) : 'N/A'}
                </Text>
              </View>
              <View 
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: `${getThresholdColor(company?.alertThreshold || '')}20` }}
              >
                <Text 
                  className="text-xs font-semibold"
                  style={{ color: getThresholdColor(company?.alertThreshold || '') }}
                >
                  {company?.alertThreshold ? getAlertThresholdLabel(company.alertThreshold) : 'N/A'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center py-3">
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
                <Ionicons name="sync-outline" size={20} color="#4988C4" />
              </View>
              <View className="flex-1">
                <Text className="text-xs" style={{ color: 'rgba(15, 40, 84, 0.6)' }}>Sync Mode</Text>
                <Text className="text-sm font-medium capitalize" style={{ color: '#0F2854' }}>
                  {company?.syncMode || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Admin Note */}
          <View className="bg-[#BDE8F5] rounded-2xl p-4 border" style={{ borderColor: '#4988C4' }}>
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={22} color="#4988C4" />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-medium text-[#1D4ED8]">Need to update settings?</Text>
                <Text className="text-xs text-[#6B7280] mt-1">
                  Contact your organisation administrator to modify these settings.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
}

