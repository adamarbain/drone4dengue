import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'action', label: 'Action', icon: 'flash' },
  { key: 'drone', label: 'Drone', icon: 'paper-plane' },
  { key: 'notification', label: 'Notification', icon: 'notifications' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine the active tab based on the current path
  const active = pathname.replace('/', '') || 'dashboard';

  return (
    <View
      className="flex-row bg-[#7D0A0A] px-3 pb-6 pt-3 justify-between items-center rounded-t-3xl"
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
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
    >
      {tabs.map(tab => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            className="flex-1 items-center"
            onPress={() => {
              if (tab.key === 'dashboard') {
                router.replace('/' as '/');
              } else if (tab.key === 'action') {
                router.replace('/action' as '/action');
              } else if (tab.key === 'drone') {
                router.replace('/drone' as '/drone');
              } else if (tab.key === 'notification') {
                router.replace('/notification' as '/notification');
              } else if (tab.key === 'profile') {
                router.replace('/profile' as '/profile');
              }
            }}
            activeOpacity={0.8}
            style={{ paddingVertical: 2 }}
          >
            <View style={{
              backgroundColor: isActive ? '#EAD196' : 'transparent',
              borderRadius: 18,
              paddingHorizontal: isActive ? 18 : 0,
              paddingVertical: isActive ? 6 : 0,
              marginBottom: 2,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              minWidth: 44,
            }}>
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={isActive ? '#7D0A0A' : '#fff'}
                style={{ marginBottom: 0 }}
              />
            </View>
            <Text
              className={`font-bold ${isActive ? 'text-[#7D0A0A]' : 'text-white'}`}
              style={{ marginTop: 2, letterSpacing: 0.2, fontSize: 10 }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
} 