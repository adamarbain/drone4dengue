import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from './components/BottomNav';
import { isTablet, getHorizontalPadding } from '../utils/responsive';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

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
    // const showLoader = useMinimumLoadingTime(loading, 1000);
    const riskLevel: RiskLevel = (typeof risk === 'string' && ['high', 'medium', 'low'].includes(risk)) ? (risk as RiskLevel) : 'low';
    const riskConfig = getRiskConfig(riskLevel);
    const tablet = isTablet();

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

    // if (showLoader) {
    //     return (
    //         <FullScreenLoader
    //             title="Loading recommendations..."
    //             subtitle={`Fetching preventive measures for ${riskLevel} risk level`}
    //         />
    //     );
    // }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: riskConfig.backgroundColor }}>
            {/* Content Container for Tablet Centering */}
            <View style={{ 
                flex: 1, 
                width: '100%', 
                maxWidth: tablet ? 700 : undefined,
                alignSelf: 'center',
                paddingHorizontal: tablet ? getHorizontalPadding() : 0,
            }}>
                {/* Header */}
                <View 
                    className="flex-row items-center"
                    style={{ paddingHorizontal: tablet ? 0 : 24, paddingTop: tablet ? 40 : 32, paddingBottom: 16 }}
                >
                    <Text 
                        className={`font-bold ${riskLevel === 'low' ? 'text-black' : 'text-white'} flex-1`}
                        style={{ fontSize: tablet ? 44 : 36 }}
                    >
                        {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                    </Text>
                    <Text style={{ fontSize: tablet ? 40 : 32 }}>{riskConfig.icon}</Text>
                </View>

                {/* Content Area */}
                <View 
                    className="flex-1 bg-white rounded-t-2xl"
                    style={{ marginHorizontal: tablet ? 0 : 16, padding: tablet ? 32 : 24, marginTop: 8 }}
                >
                    <Text 
                        className="font-bold text-black text-center mb-2"
                        style={{ fontSize: tablet ? 36 : 28 }}
                    >
                        Recommendations
                    </Text>
                    <Text 
                        className="text-gray-500 text-center mb-4"
                        style={{ fontSize: tablet ? 16 : 14 }}
                    >
                        {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''} for {riskLevel} risk
                    </Text>

                    {recommendations.length === 0 ? (
                        <View className="flex-1 items-center justify-center">
                            <Ionicons name="document-text-outline" size={tablet ? 64 : 48} color="#9CA3AF" />
                            <Text className="text-gray-500 mt-4 text-center" style={{ fontSize: tablet ? 16 : 14 }}>No recommendations available for this risk level</Text>
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
                                            className="flex-row items-center justify-between"
                                            style={{ paddingVertical: tablet ? 20 : 16 }}
                                            onPress={() => setSelected(isExpanded ? null : idx)}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-1 mr-4">
                                                <View className="flex-row items-center mb-1">
                                                    <View 
                                                        className="rounded-full items-center justify-center mr-2"
                                                        style={{ 
                                                            width: tablet ? 32 : 24, 
                                                            height: tablet ? 32 : 24,
                                                            backgroundColor: riskConfig.backgroundColor + '20' 
                                                        }}
                                                    >
                                                        <Text 
                                                            className="font-bold" 
                                                            style={{ color: riskConfig.backgroundColor, fontSize: tablet ? 14 : 12 }}
                                                        >
                                                            {idx + 1}
                                                        </Text>
                                                    </View>
                                                    <Text 
                                                        className="font-semibold text-black flex-1"
                                                        style={{ fontSize: tablet ? 18 : 16 }}
                                                    >
                                                        {rec.title}
                                                    </Text>
                                                </View>
                                                {!isExpanded && (
                                                    <Text 
                                                        className="text-gray-500" 
                                                        numberOfLines={2}
                                                        style={{ marginLeft: tablet ? 40 : 32, fontSize: tablet ? 16 : 14 }}
                                                    >
                                                        {rec.details.length > 80 ? rec.details.substring(0, 80) + '...' : rec.details}
                                                    </Text>
                                                )}
                                            </View>
                                            <Ionicons 
                                                name={isExpanded ? "chevron-up" : "chevron-down"} 
                                                size={tablet ? 24 : 20} 
                                                color="#9CA3AF" 
                                            />
                                        </TouchableOpacity>
                                        {isExpanded && (
                                            <View style={{ paddingBottom: 16, marginLeft: tablet ? 40 : 32 }}>
                                                <Text 
                                                    className="text-gray-600 mb-3"
                                                    style={{ fontSize: tablet ? 18 : 16, lineHeight: tablet ? 28 : 24 }}
                                                >
                                                    {rec.details}
                                                </Text>
                                                {rec.referenceLink && (
                                                    <TouchableOpacity
                                                        onPress={() => openReferenceLink(rec.referenceLink!)}
                                                        className="flex-row items-center bg-blue-50 rounded-lg self-start"
                                                        style={{ paddingHorizontal: tablet ? 16 : 12, paddingVertical: tablet ? 12 : 8 }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons name="link-outline" size={tablet ? 20 : 16} color="#1D4ED8" />
                                                        <Text 
                                                            className="text-blue-700 ml-2 font-medium"
                                                            style={{ fontSize: tablet ? 16 : 14 }}
                                                        >
                                                            View Source
                                                        </Text>
                                                        <Ionicons name="open-outline" size={tablet ? 18 : 14} color="#1D4ED8" style={{ marginLeft: 4 }} />
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
            </View>
            <BottomNav />
        </SafeAreaView>
    );
}