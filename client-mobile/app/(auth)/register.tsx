import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agree, setAgree] = useState(false);
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: 'rgba(255,255,255,0.93)' }}>
            <StatusBar style="dark" />
            {/* Top navigation: Log in | Sign Up */}
            <View className="flex-row justify-end items-center mb-10 mt-2 px-10">
                <Link href="./login" className="text-base text-black opacity-70 mr-4">Log in</Link>
                <Text className="text-black font-bold text-base">Sign Up</Text>
            </View>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" className="px-10">
                {/* Title */}
                <Text className="text-5xl font-extrabold text-black mb-10">Sign up</Text>
                {/* Full Name */}
                <Text className="text-lg text-gray-500 mb-1">Full Name</Text>
                <TextInput
                    className="w-full border border-black rounded-xl px-4 py-4 text-lg mb-6"
                    placeholder="Full Name"
                    placeholderTextColor="#A3A3A3"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="none"
                />
                {/* Email */}
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
                {/* Password */}
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
                {/* Confirm Password */}
                <Text className="text-lg text-gray-500 mb-1">Confirm Password</Text>
                <View className="flex-row items-center border border-black rounded-xl px-4 mb-2">
                    <TextInput
                        className="flex-1 py-4 text-lg"
                        placeholder="Confirm Password"
                        placeholderTextColor="#A3A3A3"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#7A7A7A" />
                    </Pressable >
                </View>
                {/* Phone Number */}
                <Text className="text-lg text-gray-500 mb-1">Phone Number</Text>
                <View className="flex-row items-center border border-black rounded-xl px-4 mb-5">
                    <TextInput
                        className="flex-1 py-4 text-lg"
                        placeholder="+60"
                        placeholderTextColor="#A3A3A3"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                </View>
                {/* Terms and Checkbox */}
                <View className="flex-row items-center mb-4">
                    <Pressable
                        className={`w-6 h-6 rounded-md border border-blue-600 flex items-center justify-center mr-2 ${agree ? 'bg-blue-600' : 'bg-white'}`}
                        onPress={() => setAgree(!agree)}
                    >
                        {agree && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
                    </Pressable>
                    <Text className="text-[13px] text-black">Agree to DengueEye's Terms and Condition Policy.</Text>
                </View>
                {/* Register Button */}
                <TouchableOpacity
                    className="w-full bg-[#C7362F] rounded-xl py-4 shadow-lg shadow-red-200 mb-4"
                    onPress={() => { router.replace('./login'); }}
                >
                    <Text className="text-white text-center font-bold text-lg">Register</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
} 