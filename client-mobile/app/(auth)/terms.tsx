import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pt-4 pb-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4 w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#181D27" />
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-[#181D27]" style={{ fontFamily: 'SF Pro' }}>
            Terms and Privacy Policy
          </Text>
        </View>
        <Text className="text-sm text-gray-500 mt-2 ml-14">
          Last updated: {new Date().toLocaleDateString()}
        </Text>
      </View>

      {/* Content */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-6">
          {/* Terms of Service */}
          <View className="mb-8">
            <Text className="text-2xl font-bold text-[#181D27] mb-4" style={{ fontFamily: 'SF Pro' }}>
              Terms of Service
            </Text>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">1. Acceptance of Terms</Text>
              <Text className="text-sm text-gray-700 leading-6">
                By accessing and using the Drone4Dengue Admin Platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">2. Use License</Text>
              <Text className="text-sm text-gray-700 leading-6 mb-2">
                Permission is granted to temporarily use the Drone4Dengue Admin Platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </Text>
              <View className="ml-4">
                <Text className="text-sm text-gray-700 leading-6">• Modify or copy the materials</Text>
                <Text className="text-sm text-gray-700 leading-6">• Use the materials for any commercial purpose or for any public display</Text>
                <Text className="text-sm text-gray-700 leading-6">• Attempt to reverse engineer any software contained in the platform</Text>
                <Text className="text-sm text-gray-700 leading-6">• Remove any copyright or other proprietary notations from the materials</Text>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">3. User Account</Text>
              <Text className="text-sm text-gray-700 leading-6">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password.
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">4. Data Collection and Usage</Text>
              <Text className="text-sm text-gray-700 leading-6">
                The platform collects and processes data related to dengue fever monitoring, drone operations, and related analytics. By using the platform, you consent to the collection and use of this information in accordance with our Privacy Policy.
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">5. Limitation of Liability</Text>
              <Text className="text-sm text-gray-700 leading-6">
                In no event shall Drone4Dengue or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the platform.
              </Text>
            </View>
          </View>

          {/* Privacy Policy */}
          <View className="mb-8 border-t border-gray-200 pt-6">
            <Text className="text-2xl font-bold text-[#181D27] mb-4" style={{ fontFamily: 'SF Pro' }}>
              Privacy Policy
            </Text>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">1. Information We Collect</Text>
              <Text className="text-sm text-gray-700 leading-6 mb-2">
                We collect information that you provide directly to us, including:
              </Text>
              <View className="ml-4">
                <Text className="text-sm text-gray-700 leading-6">• Account information (name, email, username, phone number)</Text>
                <Text className="text-sm text-gray-700 leading-6">• Company information and affiliation</Text>
                <Text className="text-sm text-gray-700 leading-6">• Usage data and analytics</Text>
                <Text className="text-sm text-gray-700 leading-6">• Drone operation data and location information</Text>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">2. How We Use Your Information</Text>
              <Text className="text-sm text-gray-700 leading-6 mb-2">
                We use the information we collect to:
              </Text>
              <View className="ml-4">
                <Text className="text-sm text-gray-700 leading-6">• Provide, maintain, and improve our services</Text>
                <Text className="text-sm text-gray-700 leading-6">• Process your registration and manage your account</Text>
                <Text className="text-sm text-gray-700 leading-6">• Send you technical notices and support messages</Text>
                <Text className="text-sm text-gray-700 leading-6">• Monitor and analyze trends and usage</Text>
                <Text className="text-sm text-gray-700 leading-6">• Detect, prevent, and address technical issues</Text>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">3. Information Sharing</Text>
              <Text className="text-sm text-gray-700 leading-6 mb-2">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </Text>
              <View className="ml-4">
                <Text className="text-sm text-gray-700 leading-6">• With your consent</Text>
                <Text className="text-sm text-gray-700 leading-6">• To comply with legal obligations</Text>
                <Text className="text-sm text-gray-700 leading-6">• To protect our rights and safety</Text>
                <Text className="text-sm text-gray-700 leading-6">• With service providers who assist us in operating our platform</Text>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">4. Data Security</Text>
              <Text className="text-sm text-gray-700 leading-6">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">5. Your Rights</Text>
              <Text className="text-sm text-gray-700 leading-6 mb-2">
                You have the right to:
              </Text>
              <View className="ml-4">
                <Text className="text-sm text-gray-700 leading-6">• Access and receive a copy of your personal data</Text>
                <Text className="text-sm text-gray-700 leading-6">• Rectify inaccurate or incomplete data</Text>
                <Text className="text-sm text-gray-700 leading-6">• Request deletion of your personal data</Text>
                <Text className="text-sm text-gray-700 leading-6">• Object to processing of your personal data</Text>
                <Text className="text-sm text-gray-700 leading-6">• Request restriction of processing</Text>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">6. Cookies and Tracking</Text>
              <Text className="text-sm text-gray-700 leading-6">
                We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-[#181D27] mb-2">7. Changes to This Policy</Text>
              <Text className="text-sm text-gray-700 leading-6">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </Text>
            </View>
          </View>

          {/* Contact Information */}
          <View className="border-t border-gray-200 pt-6">
            <Text className="text-xl font-bold text-[#181D27] mb-2" style={{ fontFamily: 'SF Pro' }}>
              Contact Us
            </Text>
            <Text className="text-sm text-gray-700 leading-6">
              If you have any questions about these Terms and Privacy Policy, please contact us through your company administrator or the platform support team.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

