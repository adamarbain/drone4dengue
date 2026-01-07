import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isTablet, moderateScale, horizontalScale } from '../../utils/responsive';

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'action', label: 'Action', icon: 'flash' },
  { key: 'notification', label: 'Notification', icon: 'notifications' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tablet = isTablet();

  // Calculate bottom padding - use safe area insets on iOS, minimum padding on Android
  const bottomPadding = Platform.OS === 'ios' 
    ? Math.max(insets.bottom, 12) 
    : Math.max(insets.bottom, 16);

  // Responsive sizes
  const iconSize = tablet ? 26 : 22;
  const labelSize = tablet ? 11 : 10;
  const horizontalPadding = tablet ? horizontalScale(40) : 12;
  const activePillPadding = tablet ? 24 : 20;

  // Determine the active tab based on the current path
  // If on risk-analysis page, show dashboard as active
  let active = pathname.replace('/', '') || 'dashboard';
  if (active === 'risk-analysis') {
    active = 'dashboard';
  }
  if (active === 'edit-profile' || active === 'change-password' || active === 'organisation-details' || active === 'about') {
    active = 'profile';
  }
  if (active === 'recommendations') {
    active = 'action';
  }

  return (
    <View
      className="flex-row bg-[#1C4D8D] pt-3 justify-between items-center rounded-t-3xl"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: bottomPadding,
        paddingHorizontal: horizontalPadding,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
        // Center content on tablets
        ...(tablet && {
          maxWidth: 600,
          alignSelf: 'center',
          left: 'auto',
          right: 'auto',
          width: '100%',
          marginHorizontal: 'auto',
        }),
      }}
    >
      {tabs.map(tab => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            className="flex-1 items-center py-0.5"
            onPress={() => {
              if (tab.key === 'dashboard') {
                router.replace('/dashboard' as '/dashboard');
              } else if (tab.key === 'action') {
                router.replace('/action' as '/action');
              } else if (tab.key === 'notification') {
                router.replace('/notification' as '/notification');
              } else if (tab.key === 'profile') {
                router.replace('/profile' as '/profile');
              }
            }}
            activeOpacity={0.8}
          >
            <View
              className="flex-row items-center justify-center rounded-full mb-0.5"
              style={{
                backgroundColor: isActive ? '#BDE8F5' : 'transparent',
                paddingHorizontal: isActive ? activePillPadding : 8,
                paddingVertical: 8,
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={iconSize}
                color={isActive ? '#0F2854' : '#FFFFFF'}
              />
            </View>
            <Text
              className="mt-0.5 font-bold tracking-tight text-white"
              style={{ fontSize: labelSize }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
} 