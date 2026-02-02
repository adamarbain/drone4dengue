import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomNav from './components/BottomNav';
import { fetchCurrentUser, updateUserProfile } from '../utils/userApi';
import { Ionicons } from '@expo/vector-icons';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

export default function EditProfilePage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    // const showLoader = useMinimumLoadingTime(loading, 1000);
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
            // Explicitly send phone and address even if empty strings
            // This allows users to clear these fields
            const updateData: { name: string; username: string; phone?: string; address?: string } = {
                name, 
                username
            };
            
            // Always include phone and address, even if empty strings
            // This ensures the backend receives them and can clear the fields
            updateData.phone = phone;
            updateData.address = address;
            
            await updateUserProfile(updateData);
            setModal({ visible: true, type: 'success', message: 'Profile updated successfully!' });
        } catch (err) {
            const message = (err instanceof Error) ? err.message : 'Failed to update profile';
            setModal({ visible: true, type: 'error', message });
        } finally {
            setSaving(false);
        }
    };

    // if (showLoader) {
    //     return (
    //         <FullScreenLoader
    //             title="Loading profile..."
    //             subtitle="Fetching your account information"
    //         />
    //     );
    // }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="px-6 pt-6 pb-4 ml-4">
                    <View className="flex-row items-center mb-2">
                        <Text className="text-3xl font-extrabold" style={{ fontFamily: 'SF Pro', color: '#0F2854' }}>
                            Edit Profile
                        </Text>
                    </View>
                    <Text className="text-sm" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
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
                                style={{ color: '#0F2854' }}
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
                                editable={true}
                                style={{ color: '#181D27', flex: 1, paddingVertical: 0 }}
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
                                editable={true}
                                style={{ color: '#181D27', minHeight: 60, flex: 1, paddingVertical: 0 }}
                            />
                        </View>
                    </View>

                    {/* Info Note */}
                    <View className="rounded-xl p-4 mb-6 border" style={{ borderColor: '#4988C4' }}>
                        <View className="flex-row items-start">
                            <Ionicons name="information-circle-outline" size={20} color="#4988C4" style={{ marginTop: 1 }} />
                            <Text className="ml-2 text-xs flex-1" style={{ color: 'rgba(15, 40, 84, 0.8)' }}>
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
                            className="flex-1 rounded-xl py-4 items-center justify-center"
                            onPress={handleSaveConfirm}
                            disabled={saving}
                            activeOpacity={0.8}
                            style={{ opacity: saving ? 0.7 : 1, backgroundColor: '#1C4D8D' }}
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

            {/* Alert Modal */}
            <Modal
                visible={modal.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setModal({ ...modal, visible: false });
                    if (modal.type === 'success') router.back();
                }}
            >
                <View className="flex-1 bg-black/50 items-center justify-center px-6">
                    <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
                        <View className="items-center mb-4">
                            <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
                                modal.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                <Ionicons 
                                    name={modal.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
                                    size={32} 
                                    color={modal.type === 'success' ? '#10B981' : '#EF4444'} 
                                />
                            </View>
                            <Text className="text-xl font-bold text-center mb-2" style={{ color: '#0F2854' }}>
                                {modal.type === 'success' ? 'Success' : 'Error'}
                            </Text>
                            <Text className="text-sm text-center" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
                                {modal.message}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                setModal({ ...modal, visible: false });
                                if (modal.type === 'success') router.back();
                            }}
                            className={`py-3 rounded-xl ${
                                modal.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                        >
                            <Text className="text-center font-semibold text-white">OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
                            <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#BDE8F5' }}>
                                <Ionicons name="save-outline" size={32} color="#4988C4" />
                            </View>
                            <Text className="text-xl font-bold text-center" style={{ color: '#0F2854' }}>Save Changes</Text>
                            <Text className="text-sm text-center mt-2" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
                                Are you sure you want to update your profile information?
                            </Text>
                        </View>
                        <View className="flex-row gap-3 mt-4">
                            <TouchableOpacity
                                onPress={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100"
                            >
                                <Text className="text-center font-semibold" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                className="flex-1 py-3 rounded-xl"
                                style={{ backgroundColor: '#1C4D8D' }}
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
