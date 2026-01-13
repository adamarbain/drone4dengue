import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import ModalAlert from '../components/ModalAlert';
import { fetchCurrentUser } from '../utils/userApi';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

export default function UpdatePhonePage() {
    const router = useRouter();
    const [currentPhone, setCurrentPhone] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState<'input' | 'verify'>('input');
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [loading, setLoading] = useState(true);
    const showLoader = useMinimumLoadingTime(loading, 1000);
    const [timer, setTimer] = useState(0);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
    const otpRefs = useRef<(TextInput | null)[]>([]);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
        visible: false,
        type: 'success',
        message: '',
    });

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

    // Fetch current phone number
    useEffect(() => {
        fetchCurrentUser()
            .then(user => {
                setCurrentPhone(user.phone || '');
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Timer countdown
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timer]);

    const otpString = otp.join('');

    const validatePhoneNumber = (phone: string) => {
        // Basic validation - should start with + and have 10-15 digits
        const phoneRegex = /^\+?[1-9]\d{9,14}$/;
        return phoneRegex.test(phone.replace(/[\s-]/g, ''));
    };

    const handleOtpChange = (value: string, index: number) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        
        if (numericValue.length > 1) {
            // Handle paste
            const pastedOtp = numericValue.slice(0, 6).split('');
            const newOtp = [...otp];
            pastedOtp.forEach((digit, i) => {
                if (index + i < 6) {
                    newOtp[index + i] = digit;
                }
            });
            setOtp(newOtp);
            
            const lastFilledIndex = Math.min(index + pastedOtp.length - 1, 5);
            if (lastFilledIndex < 5 && newOtp[lastFilledIndex + 1] === '') {
                otpRefs.current[lastFilledIndex + 1]?.focus();
            }
        } else {
            const newOtp = [...otp];
            newOtp[index] = numericValue;
            setOtp(newOtp);
            
            if (numericValue && index < 5) {
                otpRefs.current[index + 1]?.focus();
            }
        }
        
        if (message) {
            setMessage('');
            setMessageType('');
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const sendOtp = async () => {
        if (!newPhone) {
            setModal({ visible: true, type: 'error', message: 'Please enter a phone number' });
            return;
        }

        if (!validatePhoneNumber(newPhone)) {
            setModal({ visible: true, type: 'error', message: 'Please enter a valid phone number with country code (e.g., +60123456789)' });
            return;
        }

        if (newPhone === currentPhone) {
            setModal({ visible: true, type: 'error', message: 'New phone number must be different from current' });
            return;
        }

        setSending(true);
        setMessage('');
        setMessageType('');

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setModal({ visible: true, type: 'error', message: 'Please login first' });
                setSending(false);
                return;
            }

            const res = await fetch(`${API_URL}/auth/update-phone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newPhone }),
            });

            const data = await res.json();

            if (res.ok) {
                setStep('verify');
                setOtp(['', '', '', '', '', '']);
                setTimer(600); // 10 minutes
                setMessage('OTP sent to your new phone number!');
                setMessageType('success');
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            } else {
                const errorMessage = data.error || data.message || 'Failed to send OTP';
                if (res.status === 409) {
                    setModal({ visible: true, type: 'error', message: 'This phone number is already registered to another account' });
                } else if (res.status === 400) {
                    setModal({ visible: true, type: 'error', message: errorMessage });
                } else {
                    setModal({ visible: true, type: 'error', message: errorMessage });
                }
            }
        } catch (err: any) {
            if (err.message?.includes('Network')) {
                setModal({ visible: true, type: 'error', message: 'Network error. Please check your connection.' });
            } else {
                setModal({ visible: true, type: 'error', message: 'An unexpected error occurred. Please try again.' });
            }
        } finally {
            setSending(false);
        }
    };

    const verifyOtp = async () => {
        if (otpString.length !== 6) {
            setMessage('Please enter the complete 6-digit OTP code');
            setMessageType('error');
            return;
        }

        setVerifying(true);
        setMessage('');
        setMessageType('');

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setModal({ visible: true, type: 'error', message: 'Please login first' });
                setVerifying(false);
                return;
            }

            const res = await fetch(`${API_URL}/auth/verify-phone-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newPhone, otp: otpString }),
            });

            const data = await res.json();

            if (res.ok) {
                setModal({ visible: true, type: 'success', message: 'Phone number updated and verified successfully!' });
            } else {
                const errorMessage = data.error || data.message || 'Verification failed';
                
                if (errorMessage.includes('Invalid OTP') || errorMessage.includes('invalid')) {
                    setMessage('The OTP code you entered is incorrect. Please try again.');
                    setOtp(['', '', '', '', '', '']);
                    otpRefs.current[0]?.focus();
                } else if (errorMessage.includes('expired')) {
                    setMessage('This OTP has expired. Please request a new OTP code.');
                    setOtp(['', '', '', '', '', '']);
                    setTimer(0);
                } else {
                    setMessage(errorMessage);
                }
                setMessageType('error');
            }
        } catch (err: any) {
            if (err.message?.includes('Network')) {
                setMessage('Network error. Please check your connection.');
            } else {
                setMessage('An unexpected error occurred. Please try again.');
            }
            setMessageType('error');
        } finally {
            setVerifying(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatPhoneDisplay = (phone: string | null | undefined) => {
        if (!phone) return 'Not set';
        if (phone.length > 6) {
            return phone.slice(0, 4) + '****' + phone.slice(-4);
        }
        return phone;
    };

    if (showLoader) {
        return (
            <FullScreenLoader
                title="Loading phone settings..."
                subtitle="Fetching your current phone number"
            />
        );
    }

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
                    <View className="px-6 pt-6 pb-4">
                        <View className="flex-row items-center mb-2">
                            <TouchableOpacity 
                                onPress={() => router.back()}
                                className="mr-4"
                                activeOpacity={0.7}
                            >
                                <Ionicons name="arrow-back" size={24} color="#181D27" />
                            </TouchableOpacity>
                            <Text className="text-3xl font-extrabold text-[#181D27]" style={{ fontFamily: 'SF Pro' }}>
                                {step === 'input' ? 'Update Phone' : 'Verify Phone'}
                            </Text>
                        </View>
                        <Text className="text-sm text-gray-500 ml-10">
                            {step === 'input' 
                                ? 'Update your phone number with OTP verification' 
                                : 'Enter the verification code sent to your phone'
                            }
                        </Text>
                    </View>

                    {/* Phone Icon */}
                    <View className="items-center mb-6">
                        <View className="w-20 h-20 rounded-full bg-[#1D4ED8]/10 items-center justify-center">
                            <Ionicons name={step === 'input' ? "call" : "keypad"} size={40} color="#1D4ED8" />
                        </View>
                    </View>

                    {step === 'input' ? (
                        /* Phone Input Step */
                        <View className="mx-6 bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ elevation: 2 }}>
                            {/* Current Phone Display */}
                            <View className="mb-5">
                                <Text className="text-sm font-semibold text-gray-700 mb-2">Current Phone Number</Text>
                                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 border border-gray-200">
                                    <Ionicons name="call-outline" size={20} color="#6B7280" style={{ marginRight: 12 }} />
                                    <Text className="flex-1 text-base text-gray-600">
                                        {formatPhoneDisplay(currentPhone)}
                                    </Text>
                                </View>
                            </View>

                            {/* New Phone Input */}
                            <View className="mb-6">
                                <Text className="text-sm font-semibold text-gray-700 mb-2">
                                    New Phone Number <Text className="text-red-500">*</Text>
                                </Text>
                                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                                    <Ionicons name="call-outline" size={20} color="#1D4ED8" style={{ marginRight: 12 }} />
                                    <TextInput
                                        className="flex-1 text-base"
                                        placeholder="+60123456789"
                                        placeholderTextColor="#9CA3AF"
                                        value={newPhone}
                                        onChangeText={setNewPhone}
                                        keyboardType="phone-pad"
                                        autoCapitalize="none"
                                        style={{ color: '#181D27' }}
                                    />
                                </View>
                                <Text className="text-xs text-gray-500 mt-1 ml-1">
                                    Include country code (e.g., +60 for Malaysia)
                                </Text>
                            </View>

                            {/* Action Buttons */}
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    className="flex-1 bg-gray-100 rounded-xl py-4 items-center justify-center"
                                    onPress={() => router.back()}
                                    disabled={sending}
                                    activeOpacity={0.7}
                                >
                                    <Text className="text-base font-semibold text-gray-700">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 bg-[#1D4ED8] rounded-xl py-4 items-center justify-center"
                                    onPress={sendOtp}
                                    disabled={sending || !newPhone}
                                    activeOpacity={0.8}
                                    style={{ opacity: (sending || !newPhone) ? 0.7 : 1 }}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-base font-semibold text-white">Send OTP</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        /* OTP Verification Step */
                        <View className="mx-6 bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ elevation: 2 }}>
                            {/* New Phone Display */}
                            <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                                <View className="flex-row items-center">
                                    <Ionicons name="call" size={20} color="#1D4ED8" />
                                    <Text className="ml-2 text-sm text-blue-800">
                                        OTP sent to: <Text className="font-semibold">{newPhone}</Text>
                                    </Text>
                                </View>
                            </View>

                            {/* OTP Input */}
                            <Text className="text-sm font-semibold text-gray-700 mb-3">Enter Verification Code</Text>
                            <View className="flex-row justify-between mb-4">
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            otpRefs.current[index] = ref;
                                        }}
                                        className="w-12 h-12 border-2 rounded-xl text-center text-xl font-bold"
                                        style={{
                                            borderColor: digit ? '#1D4ED8' : '#D1D5DB',
                                            backgroundColor: digit ? '#F0F7FF' : '#FFFFFF',
                                        }}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={digit}
                                        onChangeText={(value) => handleOtpChange(value, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        editable={!verifying}
                                        selectTextOnFocus
                                    />
                                ))}
                            </View>

                            {/* Timer */}
                            {timer > 0 && (
                                <View className="flex-row items-center justify-center mb-4">
                                    <Feather name="clock" size={16} color="#6B7280" />
                                    <Text className="ml-2 text-sm text-gray-600">
                                        Code expires in <Text className="font-bold text-[#1D4ED8]">{formatTime(timer)}</Text>
                                    </Text>
                                </View>
                            )}

                            {/* Message Display */}
                            {message ? (
                                <View className={`p-3 rounded-xl mb-4 ${
                                    messageType === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                }`}>
                                    <View className="flex-row items-start">
                                        <Feather
                                            name={messageType === 'success' ? 'check-circle' : 'alert-circle'}
                                            size={18}
                                            color={messageType === 'success' ? '#10B981' : '#EF4444'}
                                        />
                                        <Text className={`ml-2 flex-1 text-sm ${
                                            messageType === 'success' ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                            {message}
                                        </Text>
                                    </View>
                                </View>
                            ) : null}

                            {/* Action Buttons */}
                            <View className="flex-row gap-3 mb-4">
                                <TouchableOpacity
                                    className="flex-1 bg-gray-100 rounded-xl py-4 items-center justify-center"
                                    onPress={() => {
                                        setStep('input');
                                        setOtp(['', '', '', '', '', '']);
                                        setMessage('');
                                        setMessageType('');
                                    }}
                                    disabled={verifying}
                                    activeOpacity={0.7}
                                >
                                    <Text className="text-base font-semibold text-gray-700">Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`flex-1 rounded-xl py-4 items-center justify-center ${
                                        verifying || otpString.length !== 6 ? 'bg-gray-300' : 'bg-[#1D4ED8]'
                                    }`}
                                    onPress={verifyOtp}
                                    disabled={verifying || otpString.length !== 6}
                                    activeOpacity={0.8}
                                >
                                    {verifying ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-base font-semibold text-white">Verify & Update</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Resend OTP */}
                            {(timer === 0 || messageType === 'error') && (
                                <TouchableOpacity
                                    className="bg-gray-50 rounded-xl py-3 border border-gray-200"
                                    onPress={sendOtp}
                                    disabled={sending}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center justify-center">
                                        <Feather name="refresh-cw" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                                        <Text className="text-gray-700 font-semibold text-sm">
                                            {sending ? 'Sending...' : 'Resend OTP'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Info Note */}
                    <View className="mx-6">
                        <View className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <View className="flex-row items-start">
                                <Ionicons name="information-circle-outline" size={20} color="#1D4ED8" style={{ marginTop: 1 }} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-sm text-blue-800 font-semibold mb-1">Important</Text>
                                    <Text className="text-xs text-blue-700 leading-4">
                                        • Make sure your phone number includes country code{'\n'}
                                        • You will receive an SMS with a 6-digit verification code{'\n'}
                                        • The code expires in 10 minutes{'\n'}
                                        • Your account will be verified after phone update
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

