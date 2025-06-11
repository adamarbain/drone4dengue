import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';

export default function DronePage() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Drone Page</Text>
      <BottomNav />
    </SafeAreaView>
  );
} 