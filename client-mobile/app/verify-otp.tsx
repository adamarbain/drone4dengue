import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { fetchCurrentUser } from '../utils/userApi';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const router = useRouter();

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch user email from storage or API
  React.useEffect(() => {
    fetchCurrentUser().then(user => {
      setEmail(user.email || '');
    });
  }, []);

  const sendOtp = async () => {
    setSending(true);
    setMessage('');
    try {
      const token = await AsyncStorage.getItem('token');
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
        setMessage('OTP sent to your email!');
      } else {
        setMessage(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setMessage('Network error');
    }
    setSending(false);
  };

  const verifyOtp = async () => {
    setVerifying(true);
    setMessage('');
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/verify/email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Account verified!');
        Alert.alert('Success', 'Your account has been verified.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        setMessage(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setMessage('Network error');
    }
    setVerifying(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F8F8] p-6">
      <Text className="text-2xl font-bold mb-4">Verify Your Account</Text>
      <Text className="mb-2">Email: {email}</Text>
      <TouchableOpacity
        className="bg-[#7D0A0A] rounded-lg py-3 mb-4"
        onPress={sendOtp}
        disabled={sending}
      >
        <Text className="text-white text-center font-bold">{sending ? 'Sending...' : 'Send OTP'}</Text>
      </TouchableOpacity>
      <TextInput
        className="border rounded-lg px-4 py-3 mb-4"
        placeholder="Enter OTP"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
      />
      <TouchableOpacity
        className="bg-[#181D27] rounded-lg py-3"
        onPress={verifyOtp}
        disabled={verifying || !otp}
      >
        <Text className="text-white text-center font-bold">{verifying ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>
      {message ? <Text className="mt-4 text-center text-red-600">{message}</Text> : null}
    </SafeAreaView>
  );
}