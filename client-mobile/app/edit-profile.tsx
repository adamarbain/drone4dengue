import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView, Modal } from 'react-native';
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
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
        visible: false,
        type: 'success',
        message: '',
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        fetchCurrentUser()
            .then(user => {
                setName(user.name || '');
                setUsername(user.username || '');
                setPhone(user.phone || '');
                setAddress(user.address || '');
            })
            .catch(() => router.replace('/(auth)/login'))
            .finally(() => setLoading(false));
    }, []);

    const handleSaveConfirm = () => {
        // Validation
        if (!name.trim()) {
            setModal({ visible: true, type: 'error', message: 'Full name is required' });
            return;
        }
        if (!username.trim()) {
            setModal({ visible: true, type: 'error', message: 'Username is required' });
            return;
        }
        setShowConfirmModal(true);
    };

    const handleSave = async () => {
        setShowConfirmModal(false);
        setSaving(true);
        try {
            await updateUserProfile({ name, username, phone, address });
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
                <View className="px-6 pt-6 pb-4 ml-4">
                    <View className="flex-row items-center mb-2">
                        <Text className="text-3xl font-extrabold text-[#181D27]" style={{ fontFamily: 'SF Pro' }}>
                            Edit Profile
                        </Text>
                    </View>
                    <Text className="text-sm text-gray-500">
                        Update your personal information
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
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Full Name <Text className="text-red-500">*</Text>
                        </Text>
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
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Username <Text className="text-red-500">*</Text>
                        </Text>
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
                    <View className="mb-5">
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

                    {/* Address */}
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Address</Text>
                        <View className="flex-row items-start bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                            <Ionicons name="location-outline" size={20} color="#1D4ED8" style={{ marginRight: 12, marginTop: 2 }} />
                            <TextInput
                                className="flex-1 text-base"
                                placeholder="Enter your address"
                                placeholderTextColor="#9CA3AF"
                                value={address}
                                onChangeText={setAddress}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                style={{ color: '#181D27', minHeight: 60 }}
                            />
                        </View>
                    </View>

                    {/* Info Note */}
                    <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                        <View className="flex-row items-start">
                            <Ionicons name="information-circle-outline" size={20} color="#1D4ED8" style={{ marginTop: 1 }} />
                            <Text className="ml-2 text-xs text-blue-700 flex-1">
                                To change your password, please use the dedicated option in your profile settings.
                            </Text>
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
                            onPress={handleSaveConfirm}
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

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center px-6">
                    <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
                        <View className="items-center mb-4">
                            <View className="w-16 h-16 rounded-full bg-[#1D4ED8]/10 items-center justify-center mb-3">
                                <Ionicons name="save-outline" size={32} color="#1D4ED8" />
                            </View>
                            <Text className="text-xl font-bold text-[#181D27] text-center">Save Changes</Text>
                            <Text className="text-sm text-[#6B7280] text-center mt-2">
                                Are you sure you want to update your profile information?
                            </Text>
                        </View>
                        <View className="flex-row gap-3 mt-4">
                            <TouchableOpacity
                                onPress={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100"
                            >
                                <Text className="text-center font-semibold text-[#6B7280]">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                className="flex-1 py-3 rounded-xl bg-[#1D4ED8]"
                            >
                                <Text className="text-center font-semibold text-white">Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <BottomNav />
        </SafeAreaView>
    );
}
