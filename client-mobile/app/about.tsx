import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from './components/BottomNav';
import { isTablet, getHorizontalPadding } from '../utils/responsive';

export default function AboutPage() {
  const router = useRouter();
  const tablet = isTablet();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ 
          paddingBottom: 100,
          alignItems: tablet ? 'center' : undefined,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ 
          width: '100%', 
          maxWidth: tablet ? 600 : undefined,
          paddingHorizontal: tablet ? getHorizontalPadding() : 24,
        }}>
          {/* Header */}
          <View className="pt-10 pb-2">
            {/* <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center mb-4"
            >
              <Ionicons name="arrow-back" size={tablet ? 28 : 24} color="#0F2854" />
              <Text 
                className="font-medium ml-2" 
                style={{ color: '#0F2854', fontSize: tablet ? 18 : 16 }}
              >
                Back
              </Text>
            </TouchableOpacity> */}
            <Text 
              className="font-extrabold mb-1" 
              style={{ fontFamily: 'SF Pro', color: '#0F2854', fontSize: tablet ? 42 : 36 }}
            >
              About DengueEye
            </Text>
            <Text 
              className="mb-4" 
              style={{ color: 'rgba(15, 40, 84, 0.75)', fontSize: tablet ? 16 : 14 }}
            >
              App information, disclaimer, and data sources
            </Text>
          </View>

          {/* App Info Card */}
          <View 
            className="bg-[#1C4D8D] rounded-2xl shadow-lg mb-6"
            style={{ padding: tablet ? 24 : 20 }}
          >
            <View className="flex-row items-center mb-3">
              <View 
                className="rounded-2xl bg-white items-center justify-center mr-4 overflow-hidden"
                style={{ width: tablet ? 80 : 64, height: tablet ? 80 : 64 }}
              >
                <Image 
                  source={require('../assets/dengueeye_logo.png')} 
                  style={{ width: tablet ? 70 : 54, height: tablet ? 70 : 54 }}
                  resizeMode="contain"
                />
              </View>
              <View className="flex-1">
                <Text 
                  className="font-bold text-white"
                  style={{ fontSize: tablet ? 24 : 20 }}
                >
                  DengueEye
                </Text>
                <Text 
                  className="text-white/70"
                  style={{ fontSize: tablet ? 16 : 14 }}
                >
                  Version 1.0.7
                </Text>
              </View>
            </View>
            <Text 
              className="text-white/90"
              style={{ fontSize: tablet ? 16 : 14, lineHeight: tablet ? 24 : 20 }}
            >
              An AI-powered dengue risk prediction and prevention app designed to help communities stay safe from dengue fever.
            </Text>
          </View>

          {/* Medical Disclaimer Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons name="medical" size={tablet ? 28 : 24} color="#DC2626" />
              <Text 
                className="font-bold ml-2" 
                style={{ color: '#0F2854', fontSize: tablet ? 24 : 20 }}
              >
                Medical Disclaimer
              </Text>
            </View>
          
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <Text className="text-sm text-red-800 font-bold mb-2">⚠️ Important Notice</Text>
            <Text className="text-sm text-red-700 leading-5">
              DengueEye is intended for educational and informational purposes only. It does not provide medical diagnosis, treatment, or professional medical advice.
            </Text>
          </View>

          <Text className="text-sm text-gray-700 leading-6 mb-4">
            This app uses machine learning algorithms and publicly available data to estimate dengue fever risk levels. The predictions are estimates and may not reflect actual conditions.
          </Text>

          <View className="bg-gray-50 rounded-xl p-4">
            <Text className="text-sm font-bold text-gray-800 mb-3">This App Does NOT:</Text>
            <View className="flex-row items-start mb-2">
              <Ionicons name="close-circle" size={16} color="#DC2626" style={{ marginTop: 2 }} />
              <Text className="text-sm text-gray-700 ml-2 flex-1">Diagnose dengue fever or any medical condition</Text>
            </View>
            <View className="flex-row items-start mb-2">
              <Ionicons name="close-circle" size={16} color="#DC2626" style={{ marginTop: 2 }} />
              <Text className="text-sm text-gray-700 ml-2 flex-1">Provide medical treatment recommendations</Text>
            </View>
            <View className="flex-row items-start mb-2">
              <Ionicons name="close-circle" size={16} color="#DC2626" style={{ marginTop: 2 }} />
              <Text className="text-sm text-gray-700 ml-2 flex-1">Replace professional medical advice</Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="close-circle" size={16} color="#DC2626" style={{ marginTop: 2 }} />
              <Text className="text-sm text-gray-700 ml-2 flex-1">Guarantee accuracy of risk predictions</Text>
            </View>
          </View>
        </View>

        {/* Seek Medical Help Section */}
        <View className="mb-6">
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="medkit" size={tablet ? 24 : 20} color="#1D4ED8" />
              <Text 
                className="font-bold text-blue-800 ml-2"
                style={{ fontSize: tablet ? 18 : 16 }}
              >
                When to Seek Medical Help
              </Text>
            </View>
            <Text 
              className="text-blue-700"
              style={{ fontSize: tablet ? 16 : 14, lineHeight: tablet ? 24 : 20 }}
            >
              If you experience symptoms such as high fever, severe headache, pain behind the eyes, joint or muscle pain, rash, nausea, vomiting, or any other concerning symptoms, please seek immediate medical attention from a qualified healthcare professional.
            </Text>
          </View>
        </View>

        {/* Data Sources Section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <Ionicons name="library" size={tablet ? 28 : 24} color="#1C4D8D" />
            <Text 
              className="font-bold ml-2" 
              style={{ color: '#0F2854', fontSize: tablet ? 24 : 20 }}
            >
              Data Sources & References
            </Text>
          </View>
          
          <Text 
            className="text-gray-700 mb-4"
            style={{ fontSize: tablet ? 16 : 14, lineHeight: tablet ? 24 : 20 }}
          >
            The information and recommendations in this app are based on publicly available data and guidelines from the following credible health organizations:
          </Text>

          <TouchableOpacity
            onPress={() => openLink('https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue')}
            className="bg-white border border-gray-200 rounded-xl mb-3 shadow-sm"
            style={{ padding: tablet ? 20 : 16 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View 
                  className="rounded-full bg-blue-100 items-center justify-center mr-3"
                  style={{ width: tablet ? 48 : 40, height: tablet ? 48 : 40 }}
                >
                  <Text style={{ fontSize: tablet ? 22 : 18 }}>🌐</Text>
                </View>
                <View className="flex-1">
                  <Text 
                    className="font-semibold text-gray-800"
                    style={{ fontSize: tablet ? 18 : 16 }}
                  >
                    World Health Organization
                  </Text>
                  <Text 
                    className="text-gray-500"
                    style={{ fontSize: tablet ? 14 : 12 }}
                  >
                    Dengue and severe dengue fact sheet
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={tablet ? 22 : 18} color="#1C4D8D" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openLink('https://www.moh.gov.my/')}
            className="bg-white border border-gray-200 rounded-xl mb-3 shadow-sm"
            style={{ padding: tablet ? 20 : 16 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View 
                  className="rounded-full bg-green-100 items-center justify-center mr-3"
                  style={{ width: tablet ? 48 : 40, height: tablet ? 48 : 40 }}
                >
                  <Text style={{ fontSize: tablet ? 22 : 18 }}>🇲🇾</Text>
                </View>
                <View className="flex-1">
                  <Text 
                    className="font-semibold text-gray-800"
                    style={{ fontSize: tablet ? 18 : 16 }}
                  >
                    Ministry of Health Malaysia
                  </Text>
                  <Text 
                    className="text-gray-500"
                    style={{ fontSize: tablet ? 14 : 12 }}
                  >
                    KKM Dengue Surveillance Reports
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={tablet ? 22 : 18} color="#1C4D8D" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openLink('https://idengue.mysa.gov.my/')}
            className="bg-white border border-gray-200 rounded-xl mb-3 shadow-sm"
            style={{ padding: tablet ? 20 : 16 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View 
                  className="rounded-full bg-purple-100 items-center justify-center mr-3"
                  style={{ width: tablet ? 48 : 40, height: tablet ? 48 : 40 }}
                >
                  <Text style={{ fontSize: tablet ? 22 : 18 }}>📊</Text>
                </View>
                <View className="flex-1">
                  <Text 
                    className="font-semibold text-gray-800"
                    style={{ fontSize: tablet ? 18 : 16 }}
                  >
                    iDengue Portal
                  </Text>
                  <Text 
                    className="text-gray-500"
                    style={{ fontSize: tablet ? 14 : 12 }}
                  >
                    Malaysia official dengue data portal
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={tablet ? 22 : 18} color="#1C4D8D" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openLink('https://www.cdc.gov/dengue/')}
            className="bg-white border border-gray-200 rounded-xl mb-3 shadow-sm"
            style={{ padding: tablet ? 20 : 16 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View 
                  className="rounded-full bg-red-100 items-center justify-center mr-3"
                  style={{ width: tablet ? 48 : 40, height: tablet ? 48 : 40 }}
                >
                  <Text style={{ fontSize: tablet ? 22 : 18 }}>🇺🇸</Text>
                </View>
                <View className="flex-1">
                  <Text 
                    className="font-semibold text-gray-800"
                    style={{ fontSize: tablet ? 18 : 16 }}
                  >
                    Centers for Disease Control
                  </Text>
                  <Text 
                    className="text-gray-500"
                    style={{ fontSize: tablet ? 14 : 12 }}
                  >
                    CDC Dengue Information
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={tablet ? 22 : 18} color="#1C4D8D" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openLink('https://open-meteo.com/')}
            className="bg-white border border-gray-200 rounded-xl shadow-sm"
            style={{ padding: tablet ? 20 : 16 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View 
                  className="rounded-full bg-yellow-100 items-center justify-center mr-3"
                  style={{ width: tablet ? 48 : 40, height: tablet ? 48 : 40 }}
                >
                  <Text style={{ fontSize: tablet ? 22 : 18 }}>🌤️</Text>
                </View>
                <View className="flex-1">
                  <Text 
                    className="font-semibold text-gray-800"
                    style={{ fontSize: tablet ? 18 : 16 }}
                  >
                    Open-Meteo
                  </Text>
                  <Text 
                    className="text-gray-500"
                    style={{ fontSize: tablet ? 14 : 12 }}
                  >
                    Real-time weather data API
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={tablet ? 22 : 18} color="#1C4D8D" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacy & Contact Section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <Ionicons name="shield-checkmark" size={tablet ? 28 : 24} color="#1C4D8D" />
            <Text 
              className="font-bold ml-2" 
              style={{ color: '#0F2854', fontSize: tablet ? 24 : 20 }}
            >
              Privacy & Contact
            </Text>
          </View>

          <View 
            className="bg-gray-50 rounded-xl mb-4"
            style={{ padding: tablet ? 20 : 16 }}
          >
            <Text 
              className="text-gray-700"
              style={{ fontSize: tablet ? 16 : 14, lineHeight: tablet ? 24 : 20 }}
            >
              Your location data is used only for risk prediction and is never shared with third parties. All data is encrypted and stored securely.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => openLink('mailto:u2101735@siswa.um.edu.my')}
            className="flex-row items-center bg-white border border-gray-200 rounded-xl shadow-sm"
            style={{ padding: tablet ? 20 : 16 }}
          >
            <Ionicons name="mail-outline" size={tablet ? 26 : 22} color="#1C4D8D" />
            <View className="ml-3 flex-1">
              <Text 
                className="font-semibold text-gray-800"
                style={{ fontSize: tablet ? 18 : 16 }}
              >
                Contact Support
              </Text>
              <Text 
                className="text-gray-500"
                style={{ fontSize: tablet ? 14 : 12 }}
              >
                u2101735@siswa.um.edu.my
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={tablet ? 24 : 20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Limitation of Liability */}
        <View className="mb-6">
          <View 
            className="bg-amber-50 border border-amber-200 rounded-xl"
            style={{ padding: tablet ? 20 : 16 }}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons name="information-circle" size={tablet ? 24 : 20} color="#D97706" />
              <Text 
                className="font-bold text-amber-800 ml-2"
                style={{ fontSize: tablet ? 18 : 16 }}
              >
                Limitation of Liability
              </Text>
            </View>
            <Text 
              className="text-amber-700"
              style={{ fontSize: tablet ? 16 : 14, lineHeight: tablet ? 24 : 20 }}
            >
              The developers of DengueEye shall not be held liable for any decisions made based on the information provided by this app. Always verify information with official health authorities and consult healthcare professionals for medical concerns.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="mb-6 items-center">
          <Text 
            className="text-gray-400 text-center"
            style={{ fontSize: tablet ? 14 : 12 }}
          >
            © 2026 DengueEye. All rights reserved.
          </Text>
          <Text 
            className="text-gray-400 text-center mt-1"
            style={{ fontSize: tablet ? 14 : 12 }}
          >
            Developed for public health awareness and education.
          </Text>
        </View>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
