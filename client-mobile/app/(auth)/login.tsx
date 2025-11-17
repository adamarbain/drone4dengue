import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1=email, 2=code, 3=new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const router = useRouter();

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
        setResetVisible(false);
        setResetStep(1);
        setResetEmail('');
        setResetCode('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        setResetError('');
        setResetSuccess('');
      }, 1500);
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
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
      // This allows users to stay logged in for 1 month
      const oneMonthFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
      // Use the longer of: JWT expiration or 1 month from now
      const extendedExp = Math.max(exp * 1000, oneMonthFromNow);
      await AsyncStorage.setItem('token_exp', extendedExp.toString());
      
      // Initialize push notifications after successful login
      try {
        const { initializePushNotifications } = require('../../utils/pushNotifications');
        await initializePushNotifications();
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        // Don't block login if push notifications fail
      }
      
      router.replace('/dashboard');
    } catch (err) {
      setLoginError((err as Error).message);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      {/* Top navigation: Log in | Sign Up */}
      <View className="flex-row justify-end items-center mb-10 mt-2 px-10">
        <Text className="text-black font-bold text-base mr-4">Log in</Text>
        <Link href="./register" className="text-base text-black opacity-70">Sign Up</Link>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" className="px-10 pt-0">
        {/* Title */}
        <Text className="text-5xl font-extrabold text-black mb-10">Log in</Text>

        {/* Email Input */}
        <Text className="text-lg text-gray-500 mb-1">Email</Text>
        <TextInput
          className="w-full border border-black rounded-xl px-4 py-4 text-md mb-6"
          placeholder="Email"
          placeholderTextColor="#A3A3A3"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password Input */}
        <Text className="text-lg text-gray-500 mb-1">Password</Text>
        <View className="flex-row items-center border border-black rounded-xl px-4 mb-2">
          <TextInput
            className="flex-1 py-4 text-md"
            placeholder="Password"
            placeholderTextColor="#A3A3A3"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? 'eye' : 'eye-off'} size={24} color="#A3A3A3" />
          </Pressable>
        </View>

        {/* Error Message */}
        {loginError ? (
          <Text className="text-red-600 mb-2 text-center">{loginError}</Text>
        ) : null}

        {/* Forgot Password */}
        <TouchableOpacity className="self-end mb-8" onPress={() => setResetVisible(true)}>
          <Text className="text-base font-bold text-gray-400">Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          className="w-full bg-[#C7362F] rounded-xl py-4 shadow-lg shadow-red-200 mb-4"
          onPress={handleLogin}
          disabled={loginLoading}
        >
          {loginLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">LOG IN</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Password Reset Modal */}
      <Modal visible={resetVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <Text className="text-2xl font-bold mb-4 text-center">Reset Password</Text>
            {resetStep === 1 && (
              <>
                <Text className="mb-2">Enter your registered email address:</Text>
                <TextInput
                  className="border border-black rounded-xl px-4 py-3 mb-4"
                  placeholder="Email"
                  placeholderTextColor="#A3A3A3"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity className="bg-[#C7362F] rounded-xl py-3 mb-2" onPress={handleResetRequest} disabled={resetLoading}>
                  {resetLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-center font-bold">Send Reset Code</Text>}
                </TouchableOpacity>
              </>
            )}
            {resetStep === 2 && (
              <>
                <Text className="mb-2">Enter the code sent to your email:</Text>
                <TextInput
                  className="border border-black rounded-xl px-4 py-3 mb-4"
                  placeholder="Reset Code"
                  placeholderTextColor="#A3A3A3"
                  value={resetCode}
                  onChangeText={setResetCode}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                <TouchableOpacity className="bg-[#C7362F] rounded-xl py-3 mb-2" onPress={handleResetVerify} disabled={resetLoading}>
                  {resetLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-center font-bold">Verify Code</Text>}
                </TouchableOpacity>
              </>
            )}
            {resetStep === 3 && (
              <>
                <Text className="mb-2">Enter your new password:</Text>
                <TextInput
                  className="border border-black rounded-xl px-4 py-3 mb-2"
                  placeholder="New Password"
                  placeholderTextColor="#A3A3A3"
                  value={resetNewPassword}
                  onChangeText={setResetNewPassword}
                  secureTextEntry
                />
                <TextInput
                  className="border border-black rounded-xl px-4 py-3 mb-4"
                  placeholder="Confirm New Password"
                  placeholderTextColor="#A3A3A3"
                  value={resetConfirmPassword}
                  onChangeText={setResetConfirmPassword}
                  secureTextEntry
                />
                <TouchableOpacity className="bg-[#C7362F] rounded-xl py-3 mb-2" onPress={handleResetPassword} disabled={resetLoading}>
                  {resetLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-center font-bold">Reset Password</Text>}
                </TouchableOpacity>
              </>
            )}
            {resetError ? <Text className="text-red-500 text-center mb-2">{resetError}</Text> : null}
            {resetSuccess ? <Text className="text-green-600 text-center mb-2">{resetSuccess}</Text> : null}
            <TouchableOpacity className="mt-2" onPress={() => {
              setResetVisible(false);
              setResetStep(1);
              setResetEmail('');
              setResetCode('');
              setResetNewPassword('');
              setResetConfirmPassword('');
              setResetError('');
              setResetSuccess('');
            }}>
              <Text className="text-center text-gray-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 