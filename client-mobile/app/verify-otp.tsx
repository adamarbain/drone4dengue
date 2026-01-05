import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { fetchCurrentUser } from '../utils/userApi';
import BottomNav from './components/BottomNav';

export default function VerifyOtpPage() {
  const [otpValue, setOtpValue] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch user email from route params or storage/API
  useEffect(() => {
    // First check if email was passed as route param (e.g., from Google Sign-In)
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    } else {
      // Otherwise, try to fetch from current user
      fetchCurrentUser().then(user => {
        setEmail(user.email || '');
      }).catch(() => {
        // If fetch fails, email will remain empty
        console.log('Could not fetch user email');
      });
    }
  }, [params.email]);

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

  // Handle OTP input change - simple single input approach
  const handleOtpChange = (value: string) => {
    // Only allow numeric input, max 6 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtpValue(numericValue);
    
    // Clear message when user starts typing
    if (message) {
      setMessage('');
      setMessageType('');
    }
  };

  // Focus the hidden input when tapping on OTP boxes
  const focusInput = () => {
    inputRef.current?.focus();
  };

  const sendOtp = async () => {
    if (!email) {
      setMessage('Email address not found. Please contact support.');
      setMessageType('error');
      return;
    }

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
        setOtpValue(''); // Clear OTP input when new OTP is sent
        setOtpSent(true);
        setTimer(600); // 10 minutes in seconds
        // Focus input after a short delay
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        // Handle different error types
        const errorMessage = data.error || data.message || 'Failed to send OTP';
        if (res.status === 503) {
          setMessage('Email service is temporarily unavailable. Please try again in a few moments.');
        } else if (res.status === 500 && errorMessage.includes('configuration')) {
          setMessage('Email service error. Please contact support.');
        } else if (res.status === 404) {
          setMessage('User not found. Please check your email address.');
        } else if (res.status === 400) {
          setMessage(errorMessage);
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
    if (otpValue.length !== 6) {
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
        body: JSON.stringify({ email, otp: otpValue }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage('Account verified successfully!');
        setMessageType('success');
        setOtpValue(''); // Clear OTP input on success
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
            setOtpValue(''); // Clear on wrong OTP to encourage retry
            inputRef.current?.focus();
          } else if (errorMessage.includes('expired')) {
            setMessage('This OTP has expired. Please request a new OTP code.');
            setOtpValue(''); // Clear expired OTP
            setTimer(0);
          } else if (errorMessage.includes('not requested')) {
            setMessage('No OTP was requested. Please request a new OTP code first.');
            setOtpValue('');
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

  const formatEmailDisplay = (emailAddr: string) => {
    if (!emailAddr) return 'Not set';
    // Mask part of email for privacy display
    const [localPart, domain] = emailAddr.split('@');
    if (localPart && domain && localPart.length > 2) {
      return localPart.slice(0, 2) + '***@' + domain;
    }
    return emailAddr;
  };

  // Render individual OTP digit box
  const renderOtpBox = (index: number) => {
    const digit = otpValue[index] || '';
    const isCurrentBox = otpValue.length === index;
    const isFilled = digit !== '';
    
    return (
      <View
        key={index}
        style={{
          width: 48,
          height: 56,
          borderWidth: 2,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: isFilled ? '#4988C4' : (isCurrentBox && isFocused) ? '#4988C4' : '#C7D9EA',
          backgroundColor: isFilled ? '#BDE8F5' : '#FFFFFF',
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0F2854' }}>
          {digit}
        </Text>
        {/* Cursor indicator for current box */}
        {isCurrentBox && isFocused && !digit && (
          <View 
            style={{
              position: 'absolute',
              width: 2,
              height: 24,
              backgroundColor: '#4988C4',
            }}
          />
        )}
      </View>
    );
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
          {/* <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 mb-6 self-start"
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity> */}

          {/* Title */}
          <Text className="text-5xl font-extrabold mt-10 mb-4" style={{ fontFamily: 'SF Pro', color: '#0F2854' }}>
            Verify Account
          </Text>
          
          {/* Subtitle */}
          <Text className="text-lg mb-8" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
            We'll send a verification code to your email address
          </Text>

          {/* Email Display */}
          <View className="bg-gray-50 rounded-xl px-4 py-4 mb-6 border border-gray-200">
            <View className="flex-row items-center">
              <Feather name="mail" size={20} color="#6B7280" />
              <Text className="ml-3 text-base font-semibold text-gray-800">
                {formatEmailDisplay(email)}
              </Text>
            </View>
            {!email && (
              <Text className="text-xs text-red-500 mt-2">
                Email address not found. Please contact support.
              </Text>
            )}
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 mb-8 shadow-lg ${
              !email ? 'bg-gray-300' : 'bg-[#1C4D8D]'
            }`}
            onPress={sendOtp}
            disabled={sending || !email}
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
              <Text className="text-lg mb-3" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>Enter Verification Code</Text>
              
              {/* Hidden TextInput - handles all keyboard input */}
              <TextInput
                ref={inputRef}
                value={otpValue}
                onChangeText={handleOtpChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}
                editable={!verifying}
              />
              
              {/* Visual OTP Boxes - tap to focus hidden input */}
              <Pressable onPress={focusInput}>
                <View className="flex-row justify-between mb-4">
                  {[0, 1, 2, 3, 4, 5].map(renderOtpBox)}
                </View>
              </Pressable>

              {/* Timer */}
              {timer > 0 && (
                <View className="flex-row items-center justify-center mb-4">
                  <Feather name="clock" size={16} color="#4988C4" />
                  <Text className="ml-2 text-sm" style={{ color: 'rgba(15, 40, 84, 0.75)' }}>
                    Code expires in <Text className="font-bold" style={{ color: '#0F2854' }}>{formatTime(timer)}</Text>
                  </Text>
                </View>
              )}

              {/* Verify Button */}
              <TouchableOpacity
                className={`rounded-xl py-4 shadow-lg ${
                  verifying || otpValue.length !== 6
                    ? 'bg-gray-300'
                    : 'bg-[#1C4D8D]'
                }`}
                onPress={verifyOtp}
                disabled={verifying || otpValue.length !== 6}
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
              <Text className="text-center mb-3 text-sm" style={{ color: 'rgba(15, 40, 84, 0.65)' }}>
                Didn't receive the code?
              </Text>
              <TouchableOpacity
                className="rounded-xl py-3 border" style={{ backgroundColor: '#BDE8F5', borderColor: '#4988C4' }}
                onPress={sendOtp}
                disabled={sending}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-center">
                  <Feather name="refresh-cw" size={18} color="#4988C4" style={{ marginRight: 8 }} />
                  <Text className="text-center font-semibold text-base" style={{ color: '#0F2854' }}>
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
                <Feather name="info" size={18} color="#4988C4" style={{ marginTop: 2 }} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold mb-1" style={{ color: '#0F2854' }}>
                    Verification Tips
                  </Text>
                  <Text className="text-xs leading-4" style={{ color: 'rgba(15, 40, 84, 0.8)' }}>
                    • Check your spam/junk folder if you don't see the email{'\n'}
                    • The code expires in 10 minutes{'\n'}
                    • Just type or paste your 6-digit code{'\n'}
                    • Make sure you have access to your email inbox
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav />
    </SafeAreaView>
  );
}
