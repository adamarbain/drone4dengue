import { View, Text, TextInput, TouchableOpacity, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  return (
    <View className="flex-1 bg-white px-10 pt-20">
      <StatusBar style="dark" />

      {/* Top navigation: Log in | Sign Up */}
      <View className="flex-row justify-end items-center mb-10">
        <Text className="text-black font-bold text-base mr-4">Log in</Text>
        <Link href="./register" className="text-base text-black opacity-70">Sign Up</Link>
      </View>

      {/* Title */}
      <Text className="text-5xl font-extrabold text-black mb-10">Log in</Text>

      {/* Email Input */}
      <Text className="text-lg text-gray-500 mb-1">Email</Text>
      <TextInput
        className="w-full border border-black rounded-xl px-4 py-4 text-lg mb-6"
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
          className="flex-1 py-4 text-lg"
          placeholder="Password"
          placeholderTextColor="#A3A3A3"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <Pressable onPress={() => setShowPassword(!showPassword)}>
          <Feather name={showPassword ? 'eye-off' : 'eye'} size={24} color="#A3A3A3" />
        </Pressable>
      </View>

      {/* Forgot Password */}
      <TouchableOpacity className="self-end mb-8">
        <Text className="text-base font-bold text-gray-400">Forgot Password?</Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
        className="w-full bg-[#C7362F] rounded-xl py-4 shadow-lg shadow-red-200 mb-4"
        onPress={() => {}}
      >
        <Text className="text-white text-center font-bold text-lg">LOG IN</Text>
      </TouchableOpacity>
    </View>
  );
} 