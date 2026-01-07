import React, { useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, Modal, ActivityIndicator, Image, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initGoogleSignIn, signInWithGoogle } from '../../utils/googleAuth';
import { isTablet, moderateScale, getContentContainerStyle, getModalContainerStyle } from '../../utils/responsive';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  // Initialize Google Sign-In on component mount
  useEffect(() => {
    initGoogleSignIn();
  }, []);

  // Password reset handlers
  const handleResetRequest = async () => {
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code');
      setResetSuccess('Reset code sent to your email.');
      setResetStep(2);
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetVerify = async () => {
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired code');
      setResetSuccess('Code verified. Please enter your new password.');
      setResetStep(3);
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      setResetLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword: resetNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setResetSuccess('Password reset successful! You can now log in.');
      setTimeout(() => {
        closeResetModal();
      }, 1500);
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setResetVisible(false);
    setResetStep(1);
    setResetEmail('');
    setResetCode('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetError('');
    setResetSuccess('');
  };

  // Login handler
  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      // Prevent admin users from logging in through mobile app
      if (data.user && data.user.role === 'admin') {
        setLoginError('Admin users cannot log in through the mobile app. Please use the admin portal.');
        setLoginLoading(false);
        return;
      }
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      // Decode JWT to get expiration (exp)
      const base64Url = data.token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      const { exp } = JSON.parse(jsonPayload);
      // Extend expiration to 1 month (30 days) from now for better user experience
      const oneMonthFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);
      const extendedExp = Math.max(exp * 1000, oneMonthFromNow);
      await AsyncStorage.setItem('token_exp', extendedExp.toString());
      
      // Initialize push notifications after successful login
      try {
        const { initializePushNotifications } = require('../../utils/pushNotifications');
        await initializePushNotifications();
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
      
      router.replace('/dashboard');
    } catch (err) {
      setLoginError((err as Error).message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setLoginError('');
    try {
      const result = await signInWithGoogle();
      
      if (!result.success) {
        setLoginError(result.error || 'Google Sign-In failed');
        return;
      }

      // Initialize push notifications after successful login
      try {
        const { initializePushNotifications } = require('../../utils/pushNotifications');
        await initializePushNotifications();
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }

      // Check if user needs verification
      if (result.data?.requiresVerification) {
        // Redirect to OTP verification screen
        router.replace({
          pathname: '/verify-otp',
          params: { email: result.data.user.email }
        });
      } else {
        // User is verified, go to dashboard
        router.replace('/dashboard');
      }
    } catch (err) {
      setLoginError((err as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const getInputStyle = (fieldName: string) => {
    const isFocused = focusedField === fieldName;
    return {
      borderColor: isFocused ? '#1D4ED8' : '#E5E7EB',
      backgroundColor: isFocused ? '#EFF6FF' : '#F9FAFB',
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar style="dark" />
      
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={{ 
              flexGrow: 1, 
              paddingBottom: 40,
              alignItems: isTablet() ? 'center' : undefined,
            }} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ 
              paddingHorizontal: isTablet() ? 40 : 24,
              maxWidth: isTablet() ? 500 : undefined,
              width: '100%',
            }}>
              {/* Header with Logo */}
              <View style={{ alignItems: 'center', marginTop: isTablet() ? 60 : 40, marginBottom: isTablet() ? 48 : 40 }}>
                <View style={{ 
                  width: isTablet() ? 120 : 96, 
                  height: isTablet() ? 120 : 96, 
                  borderRadius: isTablet() ? 30 : 24, 
                  backgroundColor: '#BDE8F5',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 10,
                }}>
                  <Image 
                    source={require('../../assets/dengueeye_logo.png')} 
                    style={{ width: isTablet() ? 80 : 64, height: isTablet() ? 80 : 64 }}
                    resizeMode="contain"
                  />
                </View>
                <Text style={{ fontSize: isTablet() ? 34 : 28, fontWeight: 'bold', color: '#0F2854', letterSpacing: -0.5 }}>
                  Welcome Back
                </Text>
                <Text style={{ fontSize: isTablet() ? 18 : 16, color: '#0F2854', marginTop: 8, textAlign: 'center', opacity: 0.7 }}>
                  Sign in to continue protecting your community
                </Text>
              </View>

              {/* Form Card */}
              <View style={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: 24, 
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 15,
                elevation: 4,
              }}>
                {/* Email Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginLeft: 4 }}>
                    Email Address
                  </Text>
                  <View style={[{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    borderRadius: 16, 
                    paddingHorizontal: 16,
                    borderWidth: 2,
                  }, getInputStyle('email')]}>
                    <Ionicons 
                      name="mail-outline" 
                      size={20} 
                      color={focusedField === 'email' ? '#1D4ED8' : '#9CA3AF'} 
                      style={{ marginRight: 12 }} 
                    />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: '#111827' }}
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginLeft: 4 }}>
                    Password
                  </Text>
                  <View style={[{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    borderRadius: 16, 
                    paddingHorizontal: 16,
                    borderWidth: 2,
                  }, getInputStyle('password')]}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={20} 
                      color={focusedField === 'password' ? '#1D4ED8' : '#9CA3AF'} 
                      style={{ marginRight: 12 }} 
                    />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: '#111827' }}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                      <Feather 
                        name={showPassword ? 'eye' : 'eye-off'} 
                        size={20} 
                        color={focusedField === 'password' ? '#1D4ED8' : '#9CA3AF'} 
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 24 }} onPress={() => setResetVisible(true)}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#4988C4' }}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Error Message */}
                {loginError ? (
                  <View style={{ 
                    backgroundColor: '#FEF2F2', 
                    borderWidth: 1, 
                    borderColor: '#FECACA', 
                    borderRadius: 12, 
                    padding: 12, 
                    marginBottom: 16, 
                    flexDirection: 'row', 
                    alignItems: 'center' 
                  }}>
                    <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#DC2626', fontSize: 14, flex: 1 }}>{loginError}</Text>
                  </View>
                ) : null}

                {/* Login Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loginLoading || googleLoading}
                  activeOpacity={0.8}
                  style={{ 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: (loginLoading || googleLoading) ? '#D1D5DB' : '#1C4D8D',
                    shadowColor: '#1C4D8D',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: (loginLoading || googleLoading) ? 0 : 0.3,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18, marginRight: 8 }}>
                        Sign In
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                {/* <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                  <Text style={{ marginHorizontal: 16, color: '#9CA3AF', fontSize: 14 }}>or</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                </View> */}

                {/* Google Sign-In Button */}
                {/* <TouchableOpacity
                  onPress={handleGoogleSignIn}
                  disabled={loginLoading || googleLoading}
                  activeOpacity={0.8}
                  style={{ 
                    borderRadius: 16, 
                    paddingVertical: 16, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#FFFFFF',
                    borderWidth: 2,
                    borderColor: '#E5E7EB',
                    flexDirection: 'row',
                  }}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#1D4ED8" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Image 
                        source={{ uri: 'https://www.google.com/favicon.ico' }} 
                        style={{ width: 20, height: 20, marginRight: 12 }}
                      />
                      <Text style={{ color: '#374151', fontWeight: '600', fontSize: 16 }}>
                        Continue with Google
                      </Text>
                    </View>
                  )}
                </TouchableOpacity> */}
              </View>

              {/* Sign Up Link */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 }}>
                <Text style={{ color: '#0F2854', fontSize: isTablet() ? 18 : 16, opacity: 0.7 }}>Don't have an account? </Text>
                <Link href="./register" asChild>
                  <TouchableOpacity>
                    <Text style={{ color: '#4988C4', fontWeight: 'bold', fontSize: isTablet() ? 18 : 16 }}>Sign Up</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Password Reset Modal */}
      <Modal visible={resetVisible} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ 
            backgroundColor: '#BDE8F5', 
            borderRadius: 24, 
            padding: 24, 
            width: '100%', 
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}>
            {/* Modal Header */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ 
                width: 64, 
                height: 64, 
                borderRadius: 32, 
                backgroundColor: '#FFFFFF', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: 16 
              }}>
                <Ionicons 
                  name={resetStep === 1 ? 'mail-outline' : resetStep === 2 ? 'key-outline' : 'lock-closed-outline'} 
                  size={28} 
                  color="#4988C4" 
                />
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0F2854' }}>
                {resetStep === 1 ? 'Reset Password' : resetStep === 2 ? 'Enter Code' : 'New Password'}
              </Text>
              <Text style={{ fontSize: 14, color: '#0F2854', textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
                {resetStep === 1 
                  ? 'Enter your email to receive a reset code' 
                  : resetStep === 2 
                    ? 'Check your email for the verification code'
                    : 'Create a strong new password'}
              </Text>
            </View>

            {/* Step Indicator */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
              {[1, 2, 3].map((step) => (
                <View key={step} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: 16, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: resetStep >= step ? '#4988C4' : '#FFFFFF',
                  }}>
                    {resetStep > step ? (
                      <Feather name="check" size={16} color="#fff" />
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: resetStep >= step ? '#FFFFFF' : '#0F2854' }}>
                        {step}
                      </Text>
                    )}
                  </View>
                  {step < 3 && (
                    <View style={{ width: 32, height: 4, backgroundColor: resetStep > step ? '#4988C4' : '#FFFFFF' }} />
                  )}
                </View>
              ))}
            </View>

            {/* Step 1: Email */}
            {resetStep === 1 && (
              <>
                <View style={[{ 
                  borderRadius: 12, 
                  paddingHorizontal: 16, 
                  paddingVertical: 14, 
                  borderWidth: 2,
                }, getInputStyle('resetEmail')]}>
                  <TextInput
                    style={{ fontSize: 16, color: '#0F2854' }}
                    placeholder="Enter your email address"
                    placeholderTextColor="#1C4D8D"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('resetEmail')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <TouchableOpacity 
                  style={{ 
                    marginTop: 16, 
                    borderRadius: 12, 
                    paddingVertical: 14, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    backgroundColor: '#1C4D8D' 
                  }}
                  onPress={handleResetRequest} 
                  disabled={resetLoading}
                  activeOpacity={0.8}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Step 2: Verification Code */}
            {resetStep === 2 && (
              <>
                <View style={[{ 
                  borderRadius: 12, 
                  paddingHorizontal: 16, 
                  paddingVertical: 14, 
                  borderWidth: 2,
                }, getInputStyle('resetCode')]}>
                  <TextInput
                    style={{ fontSize: 16, color: '#0F2854', textAlign: 'center', letterSpacing: 4 }}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#1C4D8D"
                    value={resetCode}
                    onChangeText={setResetCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    onFocus={() => setFocusedField('resetCode')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <TouchableOpacity 
                  style={{ 
                    marginTop: 16, 
                    borderRadius: 12, 
                    paddingVertical: 14, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    backgroundColor: '#1C4D8D' 
                  }}
                  onPress={handleResetVerify} 
                  disabled={resetLoading}
                  activeOpacity={0.8}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Verify Code</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Step 3: New Password */}
            {resetStep === 3 && (
              <>
                <View style={[{ 
                  borderRadius: 12, 
                  paddingHorizontal: 16, 
                  paddingVertical: 14, 
                  borderWidth: 2,
                  marginBottom: 12,
                }, getInputStyle('resetNewPassword')]}>
                  <TextInput
                    style={{ fontSize: 16, color: '#0F2854' }}
                    placeholder="New password"
                    placeholderTextColor="#1C4D8D"
                    value={resetNewPassword}
                    onChangeText={setResetNewPassword}
                    secureTextEntry
                    onFocus={() => setFocusedField('resetNewPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <View style={[{ 
                  borderRadius: 12, 
                  paddingHorizontal: 16, 
                  paddingVertical: 14, 
                  borderWidth: 2,
                }, getInputStyle('resetConfirmPassword')]}>
                  <TextInput
                    style={{ fontSize: 16, color: '#0F2854' }}
                    placeholder="Confirm new password"
                    placeholderTextColor="#1C4D8D"
                    value={resetConfirmPassword}
                    onChangeText={setResetConfirmPassword}
                    secureTextEntry
                    onFocus={() => setFocusedField('resetConfirmPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <TouchableOpacity 
                  style={{ 
                    marginTop: 16, 
                    borderRadius: 12, 
                    paddingVertical: 14, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    backgroundColor: '#1C4D8D' 
                  }}
                  onPress={handleResetPassword} 
                  disabled={resetLoading}
                  activeOpacity={0.8}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Error/Success Messages */}
            {resetError ? (
              <View style={{ 
                backgroundColor: '#FEF2F2', 
                borderWidth: 1, 
                borderColor: '#FECACA', 
                borderRadius: 12, 
                padding: 12, 
                marginTop: 16, 
                flexDirection: 'row', 
                alignItems: 'center' 
              }}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={{ color: '#DC2626', fontSize: 14, flex: 1 }}>{resetError}</Text>
              </View>
            ) : null}
            {resetSuccess ? (
              <View style={{ 
                backgroundColor: '#F0FDF4', 
                borderWidth: 1, 
                borderColor: '#BBF7D0', 
                borderRadius: 12, 
                padding: 12, 
                marginTop: 16, 
                flexDirection: 'row', 
                alignItems: 'center' 
              }}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginRight: 8 }} />
                <Text style={{ color: '#16A34A', fontSize: 14, flex: 1 }}>{resetSuccess}</Text>
              </View>
            ) : null}

            {/* Cancel Button */}
            <TouchableOpacity 
              style={{ marginTop: 16, paddingVertical: 12 }} 
              onPress={closeResetModal}
            >
              <Text style={{ textAlign: 'center', color: '#0F2854', fontWeight: '500', fontSize: 16, opacity: 0.7 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
