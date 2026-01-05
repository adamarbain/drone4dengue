import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'action', label: 'Action', icon: 'flash' },
  { key: 'notification', label: 'Notification', icon: 'notifications' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine the active tab based on the current path
  // If on risk-analysis page, show dashboard as active
  let active = pathname.replace('/', '') || 'dashboard';
  if (active === 'risk-analysis') {
    active = 'dashboard';
  }
  if (active === 'edit-profile' || active === 'change-password' || active === 'organisation-details') {
    active = 'profile';
  }
  if (active === 'recommendations') {
    active = 'action';
  }

  return (
    <View
      className="flex-row bg-[#1C4D8D] px-3 pb-6 pt-3 justify-between items-center rounded-t-3xl"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
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
              className={`flex-row items-center justify-center rounded-full ${isActive ? 'bg-[#BDE8F5] px-5 py-2' : 'px-2 py-2'} mb-0.5`}
            >
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={isActive ? '#0F2854' : '#FFFFFF'}
              />
            </View>
            <Text
              className={`mt-0.5 font-bold text-xs tracking-tight ${isActive ? 'text-white' : 'text-white'}`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
} 