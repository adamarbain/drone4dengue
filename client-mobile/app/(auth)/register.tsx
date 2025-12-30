import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initGoogleSignIn, signInWithGoogle } from '../../utils/googleAuth';

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agree, setAgree] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const router = useRouter();

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

    // Initialize Google Sign-In on component mount
    useEffect(() => {
        initGoogleSignIn();
    }, []);

    const validateForm = () => {
        if (!email || !password || !confirmPassword) {
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
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    companyId: 'comp-999',
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || data.error || 'Registration failed.');
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

    // Google Sign-In handler
    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            const result = await signInWithGoogle();
            
            if (!result.success) {
                setError(result.error || 'Google Sign-In failed');
                return;
            }

            // Initialize push notifications after successful login
            try {
                const { initializePushNotifications } = require('../../utils/pushNotifications');
                await initializePushNotifications();
            } catch (notifError) {
                console.error('Error initializing push notifications:', notifError);
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
            setError((err as Error).message);
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
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <StatusBar style="dark" />
            
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView 
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} 
                        keyboardShouldPersistTaps="handled" 
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={{ paddingHorizontal: 24 }}>
                            {/* Header with Logo */}
                            <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 32 }}>
                                <View style={{ 
                                    width: 80, 
                                    height: 80, 
                                    borderRadius: 16, 
                                    backgroundColor: '#FFFFFF',
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    marginBottom: 16,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 12,
                                    elevation: 8,
                                }}>
                                    <Image 
                                        source={require('../../assets/dengueeye_logo.png')} 
                                        style={{ width: 56, height: 56 }}
                                        resizeMode="contain"
                                    />
                                </View>
                                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827', letterSpacing: -0.5 }}>
                                    Create Account
                                </Text>
                                <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>
                                    Join DengueEye to stay protected
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
                                <View style={{ marginBottom: 20 }}>
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
                                            placeholder="Create a password"
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
                                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6, marginLeft: 4 }}>
                                        Minimum 6 characters
                                    </Text>
                                </View>

                                {/* Confirm Password Input */}
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginLeft: 4 }}>
                                        Confirm Password
                                    </Text>
                                    <View style={[{ 
                                        flexDirection: 'row', 
                                        alignItems: 'center', 
                                        borderRadius: 16, 
                                        paddingHorizontal: 16,
                                        borderWidth: 2,
                                    }, getInputStyle('confirmPassword')]}>
                                        <Ionicons 
                                            name="shield-checkmark-outline" 
                                            size={20} 
                                            color={focusedField === 'confirmPassword' ? '#1D4ED8' : '#9CA3AF'} 
                                            style={{ marginRight: 12 }} 
                                        />
                                        <TextInput
                                            style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: '#111827' }}
                                            placeholder="Confirm your password"
                                            placeholderTextColor="#9CA3AF"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showConfirmPassword}
                                            onFocus={() => setFocusedField('confirmPassword')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 8 }}>
                                            <Feather 
                                                name={showConfirmPassword ? 'eye' : 'eye-off'} 
                                                size={20} 
                                                color={focusedField === 'confirmPassword' ? '#1D4ED8' : '#9CA3AF'} 
                                            />
                                        </Pressable>
                                    </View>
                                </View>

                                {/* Terms and Checkbox */}
                                <Pressable 
                                    style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}
                                    onPress={() => setAgree(!agree)}
                                >
                                    <View style={{ 
                                        width: 24, 
                                        height: 24, 
                                        borderRadius: 8, 
                                        borderWidth: 2,
                                        borderColor: agree ? '#1D4ED8' : '#D1D5DB',
                                        backgroundColor: agree ? '#1D4ED8' : '#FFFFFF',
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        marginRight: 12,
                                        marginTop: 2,
                                    }}>
                                        {agree && <Feather name="check" size={14} color="#fff" />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20 }}>
                                            I agree to DengueEye's{' '}
                                            <Text 
                                                style={{ color: '#1D4ED8', fontWeight: '600' }}
                                                onPress={() => router.push('/(auth)/terms')}
                                            >
                                                Terms & Conditions
                                            </Text>
                                            {' '}and{' '}
                                            <Text 
                                                style={{ color: '#1D4ED8', fontWeight: '600' }}
                                                onPress={() => router.push('/(auth)/terms')}
                                            >
                                                Privacy Policy
                                            </Text>
                                        </Text>
                                    </View>
                                </Pressable>

                                {/* Error Message */}
                                {error ? (
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
                                        <Text style={{ color: '#DC2626', fontSize: 14, flex: 1 }}>{error}</Text>
                                    </View>
                                ) : null}

                                {/* Register Button */}
                                <TouchableOpacity
                                    onPress={handleRegister}
                                    disabled={!agree || loading || googleLoading}
                                    activeOpacity={0.8}
                                    style={{ 
                                        borderRadius: 16, 
                                        paddingVertical: 16, 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        backgroundColor: (!agree || loading || googleLoading) ? '#D1D5DB' : '#1D4ED8',
                                        shadowColor: '#1D4ED8',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: (!agree || loading || googleLoading) ? 0 : 0.3,
                                        shadowRadius: 8,
                                        elevation: 3,
                                    }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18, marginRight: 8 }}>
                                                Create Account
                                            </Text>
                                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Divider */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                                    <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                                    <Text style={{ marginHorizontal: 16, color: '#9CA3AF', fontSize: 14 }}>or</Text>
                                    <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                                </View>

                                {/* Google Sign-In Button */}
                                <TouchableOpacity
                                    onPress={handleGoogleSignIn}
                                    disabled={loading || googleLoading}
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
                                </TouchableOpacity>

                                {/* Google Sign-In Note */}
                                <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
                                    By signing up with Google, you agree to our Terms & Conditions
                                </Text>
                            </View>

                            {/* Sign In Link */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 }}>
                                <Text style={{ color: '#6B7280', fontSize: 16 }}>Already have an account? </Text>
                                <Link href="./login" asChild>
                                    <TouchableOpacity>
                                        <Text style={{ color: '#1D4ED8', fontWeight: 'bold', fontSize: 16 }}>Sign In</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
