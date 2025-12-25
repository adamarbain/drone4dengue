import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { fetchCurrentUser } from '../utils/userApi';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch user email from storage or API
  useEffect(() => {
    fetchCurrentUser().then(user => {
      setEmail(user.email || '');
    });
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

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numeric input
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
      
      // Focus last filled box
      const lastFilledIndex = Math.min(index + pastedOtp.length - 1, 5);
      if (lastFilledIndex < 5 && newOtp[lastFilledIndex + 1] === '') {
        otpRefs.current[lastFilledIndex + 1]?.focus();
      }
    } else {
      const newOtp = [...otp];
      newOtp[index] = numericValue;
      setOtp(newOtp);
      
      // Auto-focus next box
      if (numericValue && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
    
    // Clear message when user starts typing
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
    setSending(true);
    setMessage('');
    setMessageType('');
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setMessage('Please login first');
        setMessageType('error');
        setSending(false);
        return;
      }

      const res = await fetch(`${API_URL}/auth/send/email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage('OTP sent to your email! Please check your inbox.');
        setMessageType('success');
        setOtp(['', '', '', '', '', '']); // Clear OTP input when new OTP is sent
        setOtpSent(true);
        setTimer(600); // 10 minutes in seconds
        // Focus first OTP box
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        // Handle different error types
        const errorMessage = data.error || data.message || 'Failed to send OTP';
        if (res.status === 503) {
          setMessage('Email service is temporarily unavailable. Please try again in a few moments.');
        } else if (res.status === 500 && errorMessage.includes('configuration')) {
          setMessage('Email service error. Please contact support.');
        } else if (res.status === 404) {
          setMessage('User not found. Please check your email address.');
        } else {
          setMessage(errorMessage);
        }
        setMessageType('error');
      }
    } catch (err: any) {
      // Handle network errors
      if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        setMessage('Network error. Please check your internet connection and try again.');
      } else if (err.message?.includes('timeout')) {
        setMessage('Request timed out. Please try again.');
      } else {
        setMessage('An unexpected error occurred. Please try again.');
      }
      setMessageType('error');
    }
    setSending(false);
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
        setMessage('Please login first');
        setMessageType('error');
        setVerifying(false);
        return;
      }

      const res = await fetch(`${API_URL}/auth/verify/email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, otp: otpString }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage('Account verified successfully!');
        setMessageType('success');
        setOtp(['', '', '', '', '', '']); // Clear OTP input on success
        setTimer(0);
        Alert.alert('Success', 'Your account has been verified successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        // Handle different error types from server
        const errorMessage = data.error || data.message || 'Verification failed';
        
        if (res.status === 400) {
          // Check for specific error messages
          if (errorMessage.includes('Invalid OTP') || errorMessage.includes('invalid')) {
            setMessage('The OTP code you entered is incorrect. Please try again.');
            setOtp(['', '', '', '', '', '']); // Clear on wrong OTP to encourage retry
            otpRefs.current[0]?.focus();
          } else if (errorMessage.includes('expired')) {
            setMessage('This OTP has expired. Please request a new OTP code.');
            setOtp(['', '', '', '', '', '']); // Clear expired OTP
            setTimer(0);
          } else if (errorMessage.includes('not requested')) {
            setMessage('No OTP was requested. Please request a new OTP code first.');
            setOtp(['', '', '', '', '', '']);
          } else {
            setMessage(errorMessage);
          }
        } else if (res.status === 404) {
          setMessage('User not found. Please check your email address.');
        } else if (res.status === 500) {
          setMessage('Server error. Please try again later or contact support.');
        } else {
          setMessage(errorMessage);
        }
        setMessageType('error');
      }
    } catch (err: any) {
      // Handle network errors
      if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        setMessage('Network error. Please check your internet connection and try again.');
      } else if (err.message?.includes('timeout')) {
        setMessage('Request timed out. Please try again.');
      } else {
        setMessage('An unexpected error occurred. Please try again.');
      }
      setMessageType('error');
    }
    
    setVerifying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          contentContainerStyle={{ flexGrow: 1 }} 
          keyboardShouldPersistTaps="handled"
          className="px-10"
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 mb-6 self-start"
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="text-5xl font-extrabold text-black mb-4" style={{ fontFamily: 'SF Pro' }}>
            Verify Account
          </Text>
          
          {/* Subtitle */}
          <Text className="text-lg text-gray-600 mb-8">
            We've sent a verification code to
          </Text>

          {/* Email Display */}
          <View className="bg-gray-50 rounded-xl px-4 py-4 mb-6 border border-gray-200">
            <View className="flex-row items-center">
              <Feather name="mail" size={20} color="#6B7280" />
              <Text className="ml-3 text-base font-semibold text-gray-800">{email}</Text>
            </View>
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            className="bg-[#1D4ED8] rounded-xl py-4 mb-8 shadow-lg shadow-blue-200"
            onPress={sendOtp}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                <Text className="text-white text-center font-bold text-base">Sending OTP...</Text>
              </View>
            ) : (
              <View className="flex-row items-center justify-center">
                <Feather name="send" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white text-center font-bold text-base">Send Verification Code</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* OTP Input Section */}
          {otpSent && (
            <View className="mb-6">
              <Text className="text-lg text-gray-500 mb-3">Enter Verification Code</Text>
              
              {/* OTP Input Boxes */}
              <View className="flex-row justify-between mb-4">
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      otpRefs.current[index] = ref;
                    }}
                    className="w-14 h-14 border-2 border-gray-300 rounded-xl text-center text-2xl font-bold bg-white"
                    style={{
                      borderColor: digit ? '#1D4ED8' : '#D1D5DB',
                      backgroundColor: digit ? '#F0F7FF' : '#FFFFFF',
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
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

              {/* Verify Button */}
              <TouchableOpacity
                className={`rounded-xl py-4 shadow-lg ${
                  verifying || otpString.length !== 6
                    ? 'bg-gray-300'
                    : 'bg-[#181D27] shadow-gray-300'
                }`}
                onPress={verifyOtp}
                disabled={verifying || otpString.length !== 6}
                activeOpacity={0.8}
              >
                {verifying ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white text-center font-bold text-base">Verifying...</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Feather name="check-circle" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white text-center font-bold text-base">Verify Account</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Message Display */}
          {message ? (
            <View
              className={`p-4 rounded-xl mb-4 ${
                messageType === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <View className="flex-row items-start">
                <Feather
                  name={messageType === 'success' ? 'check-circle' : 'alert-circle'}
                  size={20}
                  color={messageType === 'success' ? '#10B981' : '#EF4444'}
                  style={{ marginTop: 2 }}
                />
                <Text
                  className={`ml-3 flex-1 text-base ${
                    messageType === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {message}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Resend OTP Button */}
          {otpSent && (timer === 0 || messageType === 'error') && (
            <View className="mt-4">
              <Text className="text-center text-gray-600 mb-3 text-sm">
                Didn't receive the code?
              </Text>
              <TouchableOpacity
                className="bg-gray-100 rounded-xl py-3 border border-gray-200"
                onPress={sendOtp}
                disabled={sending}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-center">
                  <Feather name="refresh-cw" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                  <Text className="text-gray-700 text-center font-semibold text-base">
                    {sending ? 'Sending...' : 'Resend Verification Code'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Help Text */}
          <View className="mt-8 mb-4">
            <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <View className="flex-row items-start">
                <Feather name="info" size={18} color="#1D4ED8" style={{ marginTop: 2 }} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-blue-800 font-semibold mb-1">
                    Verification Tips
                  </Text>
                  <Text className="text-xs text-blue-700 leading-4">
                    • Check your spam folder if you don't see the email{'\n'}
                    • The code expires in 10 minutes{'\n'}
                    • Enter all 6 digits to verify your account
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}