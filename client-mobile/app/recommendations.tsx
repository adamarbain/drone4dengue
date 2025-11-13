import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StatusBar, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';

// Remove hardcoded RECOMMENDATIONS
// type RiskLevel = keyof typeof RECOMMENDATIONS;
type RiskLevel = 'high' | 'medium' | 'low';
type Recommendation = { title: string; details: string };

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const getRiskConfig = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
        case 'high':
            return {
                backgroundColor: '#C53030', // Red background
                icon: '🚨',
                statusBarStyle: 'light-content' as const,
            };
        case 'medium':
            return {
                backgroundColor: '#D69E2E', // Yellow background
                icon: '⚠️',
                statusBarStyle: 'light-content' as const,
            };
        case 'low':
            return {
                backgroundColor: '#E2E8F0', // Light gray background
                icon: 'ℹ️',
                statusBarStyle: 'dark-content' as const,
            };
        default:
            return {
                backgroundColor: '#E2E8F0',
                icon: 'ℹ️',
                statusBarStyle: 'dark-content' as const,
            };
    }
};

export default function RecommendationsPage() {
    const router = useRouter();
    const { risk } = useLocalSearchParams();
    const [selected, setSelected] = useState<number | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const riskLevel: RiskLevel = (typeof risk === 'string' && ['high', 'medium', 'low'].includes(risk)) ? (risk as RiskLevel) : 'low';
    const riskConfig = getRiskConfig(riskLevel);
    const screenHeight = Dimensions.get('window').height;
    const maxModalHeight = screenHeight * 0.8;

    useEffect(() => {
        fetch(`${API_URL}/recommendations/${riskLevel}`)
            .then(res => res.json())
            .then(data => setRecommendations(data))
            .catch(() => setRecommendations([]));
    }, [riskLevel]);

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: riskConfig.backgroundColor }}>
            {/* Header */}
            <View className="flex-row items-center px-6 pt-8 pb-4">
                <Text className={`text-4xl font-bold ${riskLevel === 'low' ? 'text-black' : 'text-white'} flex-1`}>
                    {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                </Text>
                <Text className="text-3xl">{riskConfig.icon}</Text>
            </View>

            {/* Content Area */}
            <View className="flex-1 bg-white mx-4 mt-2 rounded-t-2xl p-6">
                <Text className="text-3xl font-bold text-black text-center mb-6">
                    Recommendations
                </Text>

                <ScrollView
                    className="flex-1"
                    contentContainerClassName="pb-20"
                >
                    {recommendations.map((rec: Recommendation, idx: number) => (
                        <TouchableOpacity
                            key={rec.title}
                            className="py-4 px-0 border-b border-gray-100 flex-row items-center justify-between"
                            onPress={() => setSelected(idx)}
                            activeOpacity={0.7}
                        >
                            <View className="flex-1 mr-4">
                                <Text className="text-lg font-semibold text-black mb-2">
                                    {rec.title}
                                </Text>
                                <Text className="text-sm text-gray-500" numberOfLines={2}>
                                    {rec.details.length > 50 ? rec.details.substring(0, 50) + '...' : rec.details}
                                </Text>
                            </View>
                            <Text className="text-lg text-gray-300">›</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Modal for details */}
            <Modal
                visible={selected !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelected(null)}
            >
                <View className="flex-1 items-center justify-center bg-black bg-opacity-50 p-4">
                    <View 
                        className="bg-white rounded-lg p-6 w-full max-w-[90%]"
                        style={{ maxHeight: maxModalHeight }}
                    >
                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            contentContainerClassName="pb-4"
                        >
                            <Text className="text-2xl font-bold text-gray-800 mb-3">
                                {selected !== null ? recommendations[selected].title : ''}
                            </Text>
                            <Text className="text-base text-gray-600 mb-6 leading-6">
                                {selected !== null ? recommendations[selected].details : ''}
                            </Text>
                        </ScrollView>
                        <TouchableOpacity
                            onPress={() => setSelected(null)}
                            className="bg-gray-800 rounded-lg px-4 py-2 self-end mt-4"
                        >
                            <Text className="text-white font-semibold">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <BottomNav />
        </SafeAreaView>
    );
}