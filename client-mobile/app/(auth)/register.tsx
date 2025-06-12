import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from 'react-native';

export default function RegisterScreen() {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agree, setAgree] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const validateForm = () => {
        if (!fullName || !username || !email || !password || !confirmPassword || !phone) {
            setError('Please fill in all fields.');
            return false;
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setError('Please enter a valid email address.');
            return false;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return false;
        }
        if (!agree) {
            setError('You must agree to the Terms and Condition Policy.');
            return false;
        }
        setError('');
        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setError('');
        try {
            // Replace with your actual API endpoint
            const response = await fetch('http://192.168.0.21:4000/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fullName,
                    username,
                    email,
                    password,
                    phone,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Registration failed.');
            } else {
                Alert.alert('Success', 'Registration successful!', [
                    { text: 'OK', onPress: () => router.replace('./login') }
                ]);
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: 'rgba(255,255,255,0.93)' }}>
            <StatusBar style="dark" />
            {/* Top navigation: Log in | Sign Up */}
            <View className="flex-row justify-end items-center mb-10 mt-2 px-10">
                <Link href="./login" className="text-base text-black opacity-70 mr-4">Log in</Link>
                <Text className="text-black font-bold text-base">Sign Up</Text>
            </View>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" className="px-10">
                    {/* Title */}
                    <Text className="text-5xl font-extrabold text-black mb-10">Sign up</Text>
                    {/* Full Name */}
                    <Text className="text-lg text-gray-500 mb-1">Full Name</Text>
                    <TextInput
                        className="w-full border border-black rounded-xl px-4 py-4 text-md mb-6"
                        placeholder="Full Name"
                        placeholderTextColor="#A3A3A3"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="none"
                        textAlignVertical="center"
                    />
                    {/* Username */}
                    <Text className="text-lg text-gray-500 mb-1">Username</Text>
                    <TextInput
                        className="w-full border border-black rounded-xl px-4 py-4 text-md mb-6"
                        placeholder="Username"
                        placeholderTextColor="#A3A3A3"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        textAlignVertical="center"
                    />
                    {/* Email */}
                    <Text className="text-lg text-gray-500 mb-1">Email</Text>
                        <TextInput
                            className="w-full border border-black rounded-xl px-4 py-4 text-md mb-6"
                            placeholder="Email"
                            placeholderTextColor="#A3A3A3"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            textAlignVertical="center"
                        />
                    {/* Password */}
                    <Text className="text-lg text-gray-500 mb-1">Password</Text>
                    <View className="flex-row items-center border border-black rounded-xl px-4 mb-2">
                        <TextInput
                            className="flex-1 py-4 text-md"
                            placeholder="Password"
                            placeholderTextColor="#A3A3A3"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            textAlignVertical="center"
                        />
                        <Pressable onPress={() => setShowPassword(!showPassword)}>
                            <Feather name={showPassword ? 'eye' : 'eye-off'} size={24} color="#A3A3A3" />
                        </Pressable>
                    </View>
                    {/* Confirm Password */}
                    <Text className="text-lg text-gray-500 mb-1">Confirm Password</Text>
                    <View className="flex-row items-center border border-black rounded-xl px-4 mb-2">
                        <TextInput
                            className="flex-1 py-4 text-md"
                            placeholder="Confirm Password"
                            placeholderTextColor="#A3A3A3"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirmPassword}
                            textAlignVertical="center"
                        />
                        <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                            <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={24} color="#7A7A7A" />
                        </Pressable >
                    </View>
                    {/* Phone Number */}
                    <Text className="text-lg text-gray-500 mb-1">Phone Number</Text>
                    <View className="flex-row items-center border border-black rounded-xl px-4 mb-5">
                        <TextInput
                            className="flex-1 py-4 text-md"
                            placeholder="+60"
                            placeholderTextColor="#A3A3A3"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            textAlignVertical="center"
                        />
                    </View>
                    {/* Terms and Checkbox */}
                    <View className="flex-row items-center mb-4">
                        <Pressable
                            className={`w-6 h-6 rounded-md border border-red-600 flex items-center justify-center mr-2 ${agree ? 'bg-red-600' : 'bg-white'}`}
                            onPress={() => setAgree(!agree)}
                        >
                            {agree && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
                        </Pressable>
                        <Text className="text-[13px] text-black">Agree to DengueEye's Terms and Condition Policy.</Text>
                    </View>
                    {/* Error Message */}
                    {error ? (
                        <Text className="text-red-600 mb-2 text-center">{error}</Text>
                    ) : null}
                    {/* Register Button */}
                    <TouchableOpacity
                        className={`w-full rounded-xl py-4 shadow-lg shadow-red-200 mb-4 ${(!agree || loading) ? 'bg-gray-300' : 'bg-[#C7362F]'}`}
                        onPress={handleRegister}
                        disabled={!agree || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white text-center font-bold text-lg">Register</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
} 