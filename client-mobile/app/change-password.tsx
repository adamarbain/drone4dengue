import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ModalAlert from '../components/ModalAlert';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
        visible: false,
        type: 'success',
        message: '',
    });

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

    const validatePassword = () => {
        if (!currentPassword) {
            setModal({ visible: true, type: 'error', message: 'Please enter your current password' });
            return false;
        }
        if (!newPassword) {
            setModal({ visible: true, type: 'error', message: 'Please enter a new password' });
            return false;
        }
        if (newPassword.length < 6) {
            setModal({ visible: true, type: 'error', message: 'New password must be at least 6 characters' });
            return false;
        }
        if (newPassword !== confirmPassword) {
            setModal({ visible: true, type: 'error', message: 'New passwords do not match' });
            return false;
        }
        if (currentPassword === newPassword) {
            setModal({ visible: true, type: 'error', message: 'New password must be different from current password' });
            return false;
        }
        return true;
    };

    const handleChangePassword = async () => {
        if (!validatePassword()) return;

        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setSaving(false);
                setModal({ visible: true, type: 'error', message: 'Please login first' });
                return;
            }

            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            let data;
            try {
                data = await res.json();
            } catch (parseError) {
                // Handle case where response is not JSON
                data = { message: res.ok ? 'Password changed successfully' : 'Request failed' };
            }

            // Stop saving state before showing modal
            setSaving(false);

            if (res.ok) {
                // Clear form first
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Then show success modal
                setTimeout(() => {
                    setModal({ visible: true, type: 'success', message: 'Password changed successfully!' });
                }, 100);
            } else {
                const errorMessage = data.error || data.message || 'Failed to change password';
                if (errorMessage.includes('incorrect') || errorMessage.includes('Current password')) {
                    setModal({ visible: true, type: 'error', message: 'Current password is incorrect' });
                } else {
                    setModal({ visible: true, type: 'error', message: errorMessage });
                }
            }
        } catch (err: any) {
            setSaving(false);
            if (err.message?.includes('Network')) {
                setModal({ visible: true, type: 'error', message: 'Network error. Please check your connection.' });
            } else {
                setModal({ visible: true, type: 'error', message: 'An unexpected error occurred. Please try again.' });
            }
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View className="px-6 pt-6 pb-4 ml-4">
                        <View className="flex-row items-center mb-2">
                            <Text className="text-3xl font-extrabold text-[#181D27]" style={{ fontFamily: 'SF Pro' }}>
                                Change Password
                            </Text>
                        </View>
                        <Text className="text-sm text-gray-500">
                            Update your account password
                        </Text>
                    </View>

                    {/* Security Icon */}
                    <View className="items-center mb-6">
                        <View className="w-20 h-20 rounded-full bg-[#1D4ED8]/10 items-center justify-center">
                            <Ionicons name="lock-closed" size={40} color="#1D4ED8" />
                        </View>
                    </View>

                    {/* Form Card */}
                    <View className="mx-6 bg-white rounded-2xl shadow-sm p-6 mb-6"
                        style={{ elevation: 2 }}
                    >
                        {/* Current Password */}
                        <View className="mb-5">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Current Password <Text className="text-red-500">*</Text>
                            </Text>
                            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                                <Ionicons name="lock-closed-outline" size={20} color="#1D4ED8" style={{ marginRight: 12 }} />
                                <TextInput
                                    className="flex-1 text-base"
                                    placeholder="Enter current password"
                                    placeholderTextColor="#9CA3AF"
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry={!showCurrentPassword}
                                    autoCapitalize="none"
                                    style={{ color: '#181D27' }}
                                />
                                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                                    <Ionicons 
                                        name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={20} 
                                        color="#9CA3AF" 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View className="mb-5">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                New Password <Text className="text-red-500">*</Text>
                            </Text>
                            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                                <Ionicons name="key-outline" size={20} color="#1D4ED8" style={{ marginRight: 12 }} />
                                <TextInput
                                    className="flex-1 text-base"
                                    placeholder="Enter new password"
                                    placeholderTextColor="#9CA3AF"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNewPassword}
                                    autoCapitalize="none"
                                    style={{ color: '#181D27' }}
                                />
                                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                    <Ionicons 
                                        name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={20} 
                                        color="#9CA3AF" 
                                    />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-xs text-gray-500 mt-1 ml-1">
                                Must be at least 6 characters
                            </Text>
                        </View>

                        {/* Confirm New Password */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Confirm New Password <Text className="text-red-500">*</Text>
                            </Text>
                            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                                <Ionicons name="checkmark-circle-outline" size={20} color="#1D4ED8" style={{ marginRight: 12 }} />
                                <TextInput
                                    className="flex-1 text-base"
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    style={{ color: '#181D27' }}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons 
                                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={20} 
                                        color="#9CA3AF" 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Password Match Indicator */}
                        {confirmPassword.length > 0 && (
                            <View className={`flex-row items-center mb-4 p-3 rounded-xl ${
                                newPassword === confirmPassword ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                                <Ionicons 
                                    name={newPassword === confirmPassword ? "checkmark-circle" : "close-circle"} 
                                    size={18} 
                                    color={newPassword === confirmPassword ? "#10B981" : "#EF4444"} 
                                />
                                <Text className={`ml-2 text-sm ${
                                    newPassword === confirmPassword ? 'text-green-700' : 'text-red-700'
                                }`}>
                                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                </Text>
                            </View>
                        )}

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
                                onPress={handleChangePassword}
                                disabled={saving}
                                activeOpacity={0.8}
                                style={{ opacity: saving ? 0.7 : 1 }}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-base font-semibold text-white">Change Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Security Tips */}
                    <View className="mx-6">
                        <View className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <View className="flex-row items-start">
                                <Ionicons name="shield-checkmark-outline" size={20} color="#1D4ED8" style={{ marginTop: 1 }} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-sm text-blue-800 font-semibold mb-1">Security Tips</Text>
                                    <Text className="text-xs text-blue-700 leading-4">
                                        • Use a mix of letters, numbers, and symbols{'\n'}
                                        • Avoid using personal information{'\n'}
                                        • Don't reuse passwords from other accounts{'\n'}
                                        • Change your password regularly
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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
        </SafeAreaView>
    );
}

