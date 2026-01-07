import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCLAIMER_ACCEPTED_KEY = 'medical_disclaimer_accepted';
const DISCLAIMER_VERSION = '1.0'; // Increment this to show disclaimer again for new terms

interface MedicalDisclaimerModalProps {
  onAccept?: () => void;
}

export default function MedicalDisclaimerModal({ onAccept }: MedicalDisclaimerModalProps) {
  const [visible, setVisible] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    checkDisclaimerStatus();
  }, []);

  const checkDisclaimerStatus = async () => {
    try {
      const acceptedVersion = await AsyncStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
      if (acceptedVersion !== DISCLAIMER_VERSION) {
        setVisible(true);
      }
    } catch (error) {
      console.error('Error checking disclaimer status:', error);
      setVisible(true);
    }
  };

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_ACCEPTED_KEY, DISCLAIMER_VERSION);
      setVisible(false);
      onAccept?.();
    } catch (error) {
      console.error('Error saving disclaimer acceptance:', error);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View className="flex-1 bg-black/70 items-center justify-center px-4">
        <View className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" style={{ maxHeight: '85%' }}>
          {/* Header */}
          <View className="bg-[#1C4D8D] px-6 py-5">
            <View className="flex-row items-center justify-center mb-2">
              <Ionicons name="medical" size={28} color="#FFFFFF" />
              <Text className="text-xl font-bold text-white ml-2">Medical Disclaimer</Text>
            </View>
            <Text className="text-sm text-white/80 text-center">
              Please read and accept before continuing
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            className="px-6 py-4"
            onScroll={handleScroll}
            scrollEventThrottle={100}
            showsVerticalScrollIndicator={true}
          >
            {/* Important Notice */}
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="warning" size={20} color="#D97706" />
                <Text className="text-base font-bold text-amber-700 ml-2">Important Notice</Text>
              </View>
              <Text className="text-sm text-amber-800 leading-5">
                DengueEye is an educational and informational tool only. It is NOT a medical device and does NOT provide medical diagnosis, treatment, or professional medical advice.
              </Text>
            </View>

            {/* Main Disclaimer */}
            <Text className="text-base font-bold text-[#0F2854] mb-3">Understanding DengueEye</Text>
            <Text className="text-sm text-gray-700 leading-6 mb-4">
              DengueEye uses machine learning algorithms and publicly available data to estimate dengue fever risk levels in geographic areas. The risk predictions provided by this app are for informational and educational purposes only.
            </Text>

            {/* What This App Does NOT Do */}
            <Text className="text-base font-bold text-[#0F2854] mb-3">This App Does NOT:</Text>
            <View className="mb-4">
              <View className="flex-row items-start mb-2">
                <Ionicons name="close-circle" size={18} color="#DC2626" style={{ marginTop: 2 }} />
                <Text className="text-sm text-gray-700 ml-2 flex-1">Diagnose dengue fever or any medical condition</Text>
              </View>
              <View className="flex-row items-start mb-2">
                <Ionicons name="close-circle" size={18} color="#DC2626" style={{ marginTop: 2 }} />
                <Text className="text-sm text-gray-700 ml-2 flex-1">Provide medical treatment recommendations</Text>
              </View>
              <View className="flex-row items-start mb-2">
                <Ionicons name="close-circle" size={18} color="#DC2626" style={{ marginTop: 2 }} />
                <Text className="text-sm text-gray-700 ml-2 flex-1">Replace professional medical advice or consultation</Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="close-circle" size={18} color="#DC2626" style={{ marginTop: 2 }} />
                <Text className="text-sm text-gray-700 ml-2 flex-1">Guarantee accuracy of risk predictions</Text>
              </View>
            </View>

            {/* Medical Advice */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="medkit" size={20} color="#1D4ED8" />
                <Text className="text-base font-bold text-blue-800 ml-2">Seek Medical Attention</Text>
              </View>
              <Text className="text-sm text-blue-800 leading-5">
                If you experience symptoms such as high fever, severe headache, pain behind the eyes, joint or muscle pain, rash, or any other concerning symptoms, please seek immediate medical attention from a qualified healthcare professional.
              </Text>
            </View>

            {/* Data Sources */}
            <Text className="text-base font-bold text-[#0F2854] mb-3">Data Sources & References</Text>
            <Text className="text-sm text-gray-700 leading-6 mb-3">
              The information and recommendations in this app are based on publicly available data and guidelines from credible health organizations:
            </Text>
            <View className="mb-4">
              <TouchableOpacity 
                onPress={() => openLink('https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue')}
                className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-2"
              >
                <Ionicons name="globe-outline" size={16} color="#1C4D8D" />
                <Text className="text-sm text-[#1C4D8D] ml-2 flex-1">World Health Organization (WHO)</Text>
                <Ionicons name="open-outline" size={14} color="#1C4D8D" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => openLink('https://www.moh.gov.my/')}
                className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-2"
              >
                <Ionicons name="globe-outline" size={16} color="#1C4D8D" />
                <Text className="text-sm text-[#1C4D8D] ml-2 flex-1">Ministry of Health Malaysia (KKM)</Text>
                <Ionicons name="open-outline" size={14} color="#1C4D8D" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => openLink('https://www.cdc.gov/dengue/')}
                className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2"
              >
                <Ionicons name="globe-outline" size={16} color="#1C4D8D" />
                <Text className="text-sm text-[#1C4D8D] ml-2 flex-1">Centers for Disease Control and Prevention (CDC)</Text>
                <Ionicons name="open-outline" size={14} color="#1C4D8D" />
              </TouchableOpacity>
            </View>

            {/* Limitation of Liability */}
            <Text className="text-base font-bold text-[#0F2854] mb-3">Limitation of Liability</Text>
            <Text className="text-sm text-gray-700 leading-6 mb-4">
              The developers of DengueEye shall not be held liable for any decisions made based on the information provided by this app. Risk predictions are estimates and may not reflect actual conditions. Always verify information with official health authorities and consult healthcare professionals for medical concerns.
            </Text>

            {/* Agreement */}
            <View className="bg-gray-100 rounded-xl p-4 mb-6">
              <Text className="text-sm text-gray-700 leading-5 text-center">
                By tapping "I Understand & Accept" below, you acknowledge that you have read, understood, and agree to this disclaimer.
              </Text>
            </View>
          </ScrollView>

          {/* Accept Button */}
          <View className="px-6 pb-6 pt-2 bg-white border-t border-gray-100">
            <TouchableOpacity
              onPress={handleAccept}
              className={`py-4 rounded-xl ${hasScrolledToBottom ? 'bg-[#1C4D8D]' : 'bg-gray-300'}`}
              disabled={!hasScrolledToBottom}
            >
              <Text className={`text-center font-bold text-base ${hasScrolledToBottom ? 'text-white' : 'text-gray-500'}`}>
                {hasScrolledToBottom ? 'I Understand & Accept' : 'Please read the full disclaimer'}
              </Text>
            </TouchableOpacity>
            {!hasScrolledToBottom && (
              <Text className="text-xs text-gray-500 text-center mt-2">
                Scroll down to read the complete disclaimer
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
