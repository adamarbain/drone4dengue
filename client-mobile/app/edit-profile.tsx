import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomNav from './components/BottomNav';
import { fetchCurrentUser, updateUserProfile } from '../utils/userApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#7D0A0A" />
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1">
            {/* Gradient Background */}
            <LinearGradient
                colors={["#F8E8EE", "#EAD196", "#F8F8F8"]}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <SafeAreaView className="flex-1 px-0 pt-10">
                {/* Profile Avatar */}
                <View className="items-center mb-2">
                    <View style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        overflow: 'hidden',
                        borderWidth: 4,
                        borderColor: '#fff',
                        shadowColor: '#BF3131',
                        shadowOpacity: 0.18,
                        shadowRadius: 12,
                        elevation: 8,
                        marginBottom: 8,
                    }}>
                        <Image source={require('../assets/profile-user-image.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                    <Text className="text-2xl font-extrabold text-[#181D27]" style={{ letterSpacing: 0.2 }}>Edit Profile</Text>
                </View>
                {/* Card Container */}
                <View className="mx-6 bg-white rounded-3xl shadow-lg p-6 mt-2 mb-8" style={{ elevation: 8 }}>
                    {/* Name */}
                    <View className="mb-5">
                        <Text className="text-base text-gray-500 mb-1 ml-1">Full Name</Text>
                        <View className="flex-row items-center bg-[#F8E8EE] rounded-xl px-4">
                            <Ionicons name="person" size={22} color="#BF3131" style={{ marginRight: 8 }} />
                            <TextInput
                                className="flex-1 py-4 text-md"
                                placeholder="Full Name"
                                placeholderTextColor="#A3A3A3"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                style={{ fontWeight: '600', color: '#181D27' }}
                            />
                        </View>
                    </View>
                    {/* Username */}
                    <View className="mb-5">
                        <Text className="text-base text-gray-500 mb-1 ml-1">Username</Text>
                        <View className="flex-row items-center bg-[#F8E8EE] rounded-xl px-4">
                            <Ionicons name="at" size={22} color="#BF3131" style={{ marginRight: 8 }} />
                            <TextInput
                                className="flex-1 py-4 text-md"
                                placeholder="Username"
                                placeholderTextColor="#A3A3A3"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                style={{ fontWeight: '600', color: '#181D27' }}
                            />
                        </View>
                    </View>
                    {/* Phone */}
                    <View className="mb-7">
                        <Text className="text-base text-gray-500 mb-1 ml-1">Phone Number</Text>
                        <View className="flex-row items-center bg-[#F8E8EE] rounded-xl px-4">
                            <Ionicons name="call" size={22} color="#BF3131" style={{ marginRight: 8 }} />
                            <TextInput
                                className="flex-1 py-4 text-md"
                                placeholder="Phone Number"
                                placeholderTextColor="#A3A3A3"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                style={{ fontWeight: '600', color: '#181D27' }}
                            />
                        </View>
                    </View>
                    {/* Buttons */}
                    <View className="flex-row justify-between mt-2">
                        <TouchableOpacity
                            className="flex-1 bg-gray-200 rounded-xl py-4 mr-2"
                            onPress={() => router.back()}
                            disabled={saving}
                            style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
                        >
                            <Text className="text-center font-bold text-lg text-gray-600">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 ml-2"
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.8}
                            style={{
                                shadowColor: '#BF3131',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.25,
                                shadowRadius: 12,
                                elevation: 8,
                            }}
                        >
                            <LinearGradient
                                colors={saving ? ['#D4AF37', '#EAD196'] : ['#BF3131', '#E85A4F', '#EAD196']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    borderRadius: 16,
                                    paddingVertical: 16,
                                    paddingHorizontal: 24,
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Shimmer effect overlay for saving state */}
                                {saving && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: 16,
                                        }}
                                    />
                                )}

                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                    {saving && (
                                        <ActivityIndicator
                                            size="small"
                                            color="white"
                                            style={{ marginRight: 8 }}
                                        />
                                    )}

                                    <Text
                                        style={{
                                            color: 'white',
                                            fontSize: 18,
                                            fontWeight: '700',
                                            letterSpacing: 0.5,
                                            textAlign: 'center',
                                            textShadowColor: 'rgba(0, 0, 0, 0.3)',
                                            textShadowOffset: { width: 0, height: 1 },
                                            textShadowRadius: 2,
                                        }}
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </Text>
                                </View>

                                {/* Subtle inner glow */}
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: 1,
                                        left: 1,
                                        right: 1,
                                        height: 2,
                                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                        borderTopLeftRadius: 15,
                                        borderTopRightRadius: 15,
                                    }}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
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
        </View>
    );
} 