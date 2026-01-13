import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from './components/BottomNav';
import { StatusBar } from 'expo-status-bar';
import { PASSWORD_POLICY_DESCRIPTION, getPasswordValidationError } from '../utils/passwordPolicy';

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
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

    const validatePassword = () => {
        if (!currentPassword) {
            setModal({ visible: true, type: 'error', message: 'Please enter your current password' });
            return false;
        }

        const strengthError = getPasswordValidationError(newPassword, 'New password');
        if (strengthError) {
            setModal({ visible: true, type: 'error', message: strengthError });
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

    const handleChangePasswordConfirm = () => {
        if (!validatePassword()) return;
        setShowConfirmModal(true);
    };

    const handleChangePassword = async () => {
        setShowConfirmModal(false);
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
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View className="px-6 pt-6 pb-4 ml-4">
                        <View className="flex-row items-center mb-2">
                            <Text className="text-3xl font-extrabold" style={{ fontFamily: 'SF Pro', color: '#0F2854' }}>
                                Change Password
                            </Text>
                        </View>
                        <Text className="text-sm" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
                            Update your account password
                        </Text>
                    </View>

                    {/* Security Icon */}
                    <View className="items-center mb-6">
                        <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: '#BDE8F5' }}>
                            <Ionicons name="lock-closed" size={40} color="#4988C4" />
                        </View>
                    </View>

                    {/* Form Card */}
                    <View className="mx-6 bg-white rounded-2xl shadow-sm p-6 mb-6"
                        style={{ elevation: 2 }}
                    >
                        {/* Current Password */}
                        <View className="mb-5">
                            <Text className="text-sm font-semibold mb-2" style={{ color: '#0F2854' }}>
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
                            <Text className="text-sm font-semibold mb-2" style={{ color: '#0F2854' }}>
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
                            <Text className="text-xs mt-1 ml-1" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
                                {PASSWORD_POLICY_DESCRIPTION}
                            </Text>
                        </View>

                        {/* Confirm New Password */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold mb-2" style={{ color: '#0F2854' }}>
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
                                className="flex-1 rounded-xl py-4 items-center justify-center"
                                onPress={handleChangePasswordConfirm}
                                disabled={saving}
                                activeOpacity={0.8}
                                style={{ opacity: saving ? 0.7 : 1, backgroundColor: '#1C4D8D' }}
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
                        <View className="rounded-xl p-4 border" style={{ borderColor: '#4988C4' }}>
                            <View className="flex-row items-start">
                                <Ionicons name="shield-checkmark-outline" size={20} color="#4988C4" style={{ marginTop: 1 }} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-sm font-semibold mb-1" style={{ color: '#0F2854' }}>Security Tips</Text>
                                    <Text className="text-xs leading-4" style={{ color: 'rgba(15, 40, 84, 0.8)' }}>
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
                            <Text className="text-xl font-bold text-[#181D27] text-center mb-2">
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
                                <Ionicons name="key-outline" size={32} color="#4988C4" />
                            </View>
                            <Text className="text-xl font-bold text-center" style={{ color: '#0F2854' }}>Change Password</Text>
                            <Text className="text-sm text-center mt-2" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
                                Are you sure you want to change your password? You will need to use the new password for future logins.
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
                                onPress={handleChangePassword}
                                className="flex-1 py-3 rounded-xl" style={{ backgroundColor: '#1C4D8D' }}
                            >
                                <Text className="text-center font-semibold text-white">Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Bottom Navigation */}
            <BottomNav />
        </SafeAreaView>
    );
}

