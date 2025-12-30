import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from './components/BottomNav';

type RiskLevel = 'high' | 'medium' | 'low';
type Recommendation = { 
    id: string;
    title: string; 
    details: string;
    referenceLink?: string | null;
};

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
    const [loading, setLoading] = useState(true);
    const riskLevel: RiskLevel = (typeof risk === 'string' && ['high', 'medium', 'low'].includes(risk)) ? (risk as RiskLevel) : 'low';
    const riskConfig = getRiskConfig(riskLevel);

    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/recommendations/${riskLevel}`)
            .then(res => res.json())
            .then(data => {
                setRecommendations(data);
                setLoading(false);
            })
            .catch(() => {
                setRecommendations([]);
                setLoading(false);
            });
    }, [riskLevel]);

    const openReferenceLink = (url: string) => {
        Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
    };

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
                <Text className="text-3xl font-bold text-black text-center mb-2">
                    Recommendations
                </Text>
                <Text className="text-sm text-gray-500 text-center mb-4">
                    {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''} for {riskLevel} risk
                </Text>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={riskConfig.backgroundColor} />
                        <Text className="text-gray-500 mt-4">Loading recommendations...</Text>
                    </View>
                ) : recommendations.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                        <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
                        <Text className="text-gray-500 mt-4 text-center">No recommendations available for this risk level</Text>
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {recommendations.map((rec: Recommendation, idx: number) => {
                            const isExpanded = selected === idx;
                            return (
                                <View key={rec.id || rec.title} className="border-b border-gray-100">
                                    <TouchableOpacity
                                        className="py-4 px-0 flex-row items-center justify-between"
                                        onPress={() => setSelected(isExpanded ? null : idx)}
                                        activeOpacity={0.7}
                                    >
                                        <View className="flex-1 mr-4">
                                            <View className="flex-row items-center mb-1">
                                                <View 
                                                    className="w-6 h-6 rounded-full items-center justify-center mr-2"
                                                    style={{ backgroundColor: riskConfig.backgroundColor + '20' }}
                                                >
                                                    <Text className="text-xs font-bold" style={{ color: riskConfig.backgroundColor }}>
                                                        {idx + 1}
                                                    </Text>
                                                </View>
                                                <Text className="text-base font-semibold text-black flex-1">
                                                    {rec.title}
                                                </Text>
                                            </View>
                                            {!isExpanded && (
                                                <Text className="text-sm text-gray-500 ml-8" numberOfLines={2}>
                                                    {rec.details.length > 80 ? rec.details.substring(0, 80) + '...' : rec.details}
                                                </Text>
                                            )}
                                        </View>
                                        <Ionicons 
                                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                                            size={20} 
                                            color="#9CA3AF" 
                                        />
                                    </TouchableOpacity>
                                    {isExpanded && (
                                        <View className="pb-4 ml-8">
                                            <Text className="text-base text-gray-600 leading-6 mb-3">
                                                {rec.details}
                                            </Text>
                                            {rec.referenceLink && (
                                                <TouchableOpacity
                                                    onPress={() => openReferenceLink(rec.referenceLink!)}
                                                    className="flex-row items-center bg-blue-50 rounded-lg px-3 py-2 self-start"
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="link-outline" size={16} color="#1D4ED8" />
                                                    <Text className="text-sm text-blue-700 ml-2 font-medium">
                                                        View Source
                                                    </Text>
                                                    <Ionicons name="open-outline" size={14} color="#1D4ED8" style={{ marginLeft: 4 }} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                )}
            </View>
            <BottomNav />
        </SafeAreaView>
    );
}