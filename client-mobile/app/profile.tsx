import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function ProfilePage() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('token_exp');
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Profile Page</Text>
      <TouchableOpacity
        onPress={handleLogout}
        style={{ backgroundColor: '#C7362F', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8, marginBottom: 32 }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Log Out</Text>
      </TouchableOpacity>
      <BottomNav />
    </SafeAreaView>
  );
} 