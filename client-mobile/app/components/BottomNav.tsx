import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function BottomNav({ active = 'dashboard', onTabPress }: { active?: string, onTabPress?: (tab: string) => void }) {
  return (
    <View className="flex-row bg-[#7D0A0A] py-4 pt-2 px-2 justify-between items-center rounded-t-3xl" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <TouchableOpacity className="items-center flex-1" onPress={() => onTabPress?.('dashboard')}>
        <Ionicons name="home" size={24} color={active === 'dashboard' ? '#EAD196' : '#fff'} style={{ marginBottom: 2 }} />
        <Text className={`text-xs font-bold ${active === 'dashboard' ? 'text-[#EAD196]' : 'text-white'}`}>Dashboard</Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center flex-1" onPress={() => onTabPress?.('recommendation')}>
        <MaterialCommunityIcons name="flash" size={24} color={active === 'recommendation' ? '#EAD196' : '#fff'} style={{ marginBottom: 2 }} />
        <Text className={`text-xs font-bold ${active === 'recommendation' ? 'text-[#EAD196]' : 'text-white'}`}>Recommendation</Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center flex-1" onPress={() => onTabPress?.('notification')}>
        <Ionicons name="notifications" size={24} color={active === 'notification' ? '#EAD196' : '#fff'} style={{ marginBottom: 2 }} />
        <Text className={`text-xs font-bold ${active === 'notification' ? 'text-[#EAD196]' : 'text-white'}`}>Notification</Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center flex-1" onPress={() => onTabPress?.('profile')}>
        <Ionicons name="person" size={24} color={active === 'profile' ? '#EAD196' : '#fff'} style={{ marginBottom: 2 }} />
        <Text className={`text-xs font-bold ${active === 'profile' ? 'text-[#EAD196]' : 'text-white'}`}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
} 