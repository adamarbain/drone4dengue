import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';
import DengueRiskCard from '../components/DengueRiskCard';

export default function Dashboard() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 pt-8 pb-32">
        {/* Title */}
        <Text className="text-[36px] font-extrabold text-black mb-4" style={{ fontFamily: 'SF Pro' }}>
          Dashboard
        </Text>
        {/* Tabs */}
        <View className="flex-row mb-6 rounded-lg overflow-hidden">
          <TouchableOpacity className="flex-1 bg-[#7D0A0A] py-2">
            <Text className="text-white text-center font-bold text-base">Current</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-[#EAD196] py-2">
            <Text className="text-[#7D0A0A] text-center font-bold text-base">Specific</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-[#EAD196] py-2">
            <Text className="text-[#7D0A0A] text-center font-bold text-base">Organisation</Text>
          </TouchableOpacity>
        </View>
        {/* Map */}
        <View className="rounded-2xl overflow-hidden mb-6" style={{ height: 180 }}>
          <Image
            source={require('../assets/map.png')}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
        
        {/* Dengue Risk Prediction Card */}
        <DengueRiskCard />
        
        {/* Legacy Location and Risk (keeping for reference) */}
        <Text className="text-2xl font-bold text-black mb-1" style={{ fontFamily: 'SF Pro' }}>
          Current Location
        </Text>
        <Text className="text-xl font-bold text-black mb-1" style={{ fontFamily: 'SF Pro' }}>
          Vista Angkasa - High Risk
        </Text>
        <Text className="text-lg text-black mb-6" style={{ fontFamily: 'SF Pro Rounded' }}>
          Dengue Alert! High Risk Detected Nearby! Dengue cases and breeding sites detected in your area. Immediate action required!
        </Text>
        {/* Action Cards */}
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-[#EAD196] rounded-2xl items-center justify-center h-48">
            <Image source={require('../assets/analysis.png')} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
          </View>
          <View className="flex-1 bg-[#BF3131] rounded-2xl items-center justify-center h-48">
            <Image source={require('../assets/actions.png')} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
} 