import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomNav from './components/BottomNav';
import { fetchCurrentUser, updateUserProfile } from '../utils/userApi';
import { Ionicons } from '@expo/vector-icons';
import ModalAlert from '../components/ModalAlert';

export default function EditProfilePage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
        visible: false,
        type: 'success',
        message: '',
    });

    useEffect(() => {
        fetchCurrentUser()
            .then(user => {
                setName(user.name);
                setUsername(user.username);
                setPhone(user.phone);
            })
            .catch(() => router.replace('/(auth)/login'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateUserProfile({ name, username, phone });
            setModal({ visible: true, type: 'success', message: 'Profile updated successfully!' });
        } catch (err) {
            const message = (err instanceof Error) ? err.message : 'Failed to update profile';
            setModal({ visible: true, type: 'error', message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#1D4ED8" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="px-6 pt-6 pb-4">
                    <Text className="text-4xl font-extrabold text-[#181D27] mb-2" style={{ fontFamily: 'SF Pro' }}>
                        Edit Profile
                    </Text>
                </View>

                {/* Profile Avatar */}
                <View className="items-center mb-6">
                    <View className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg"
                        style={{ elevation: 4 }}
                    >
                        <Image 
                            source={require('../assets/profile-user-image.png')} 
                            className="w-full h-full" 
                            resizeMode="cover" 
                        />
                    </View>
                </View>

                {/* Form Card */}
                <View className="mx-6 bg-white rounded-2xl shadow-sm p-6 mb-6"
                    style={{ elevation: 2 }}
                >
                    {/* Full Name */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Full Name</Text>
                        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                            <Ionicons name="person-outline" size={20} color="#1D4ED8" style={{ marginRight: 12 }} />
                            <TextInput
                                className="flex-1 text-base"
                                placeholder="Enter your full name"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                style={{ color: '#181D27' }}
                            />
                        </View>
                    </View>

                    {/* Username */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Username</Text>
                        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                            <Ionicons name="at-outline" size={20} color="#1D4ED8" style={{ marginRight: 12 }} />
                            <TextInput
                                className="flex-1 text-base"
                                placeholder="Enter your username"
                                placeholderTextColor="#9CA3AF"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                style={{ color: '#181D27' }}
                            />
                        </View>
                    </View>

                    {/* Phone Number */}
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Phone Number</Text>
                        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                            <Ionicons name="call-outline" size={20} color="#1D4ED8" style={{ marginRight: 12 }} />
                            <TextInput
                                className="flex-1 text-base"
                                placeholder="Enter your phone number"
                                placeholderTextColor="#9CA3AF"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                style={{ color: '#181D27' }}
                            />
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-3 mt-2">
                        <TouchableOpacity
                            className="flex-1 bg-gray-100 rounded-xl py-4 items-center justify-center"
                            onPress={() => router.back()}
                            disabled={saving}
                            activeOpacity={0.7}
                        >
                            <Text className="text-base font-semibold text-gray-700">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 bg-[#1D4ED8] rounded-xl py-4 items-center justify-center"
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.8}
                            style={{ opacity: saving ? 0.7 : 1 }}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-base font-semibold text-white">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <ModalAlert
                visible={modal.visible}
                type={modal.type}
                title={modal.type === 'success' ? 'Success' : 'Error'}
                message={modal.message}
                onClose={() => {
                    setModal({ ...modal, visible: false });
                    if (modal.type === 'success') router.back();
                }}
            />
            <BottomNav />
        </SafeAreaView>
    );
} 