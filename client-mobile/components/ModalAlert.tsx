import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

// Props for the modal
interface ModalAlertProps {
  visible: boolean;
  type?: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  onClose: () => void;
}

const iconMap = {
  success: { name: 'checkmark-circle', color: '#4BB543' },
  error: { name: 'close-circle', color: '#1D4ED8' },
  info: { name: 'information-circle', color: '#EAD196' },
};

export default function ModalAlert({
  visible,
  type = 'info',
  title,
  message,
  onClose,
}: ModalAlertProps) {
  const icon = iconMap[type];

  return (
    <Modal isVisible={visible} animationIn="zoomIn" animationOut="zoomOut" backdropOpacity={0.4}>
      <View className="bg-white rounded-3xl px-8 py-8 items-center shadow-lg">
        <Ionicons name={icon.name as any} size={56} color={icon.color} style={{ marginBottom: 12 }} />
        {title && <Text className="text-xl font-bold mb-2 text-[#181D27]">{title}</Text>}
        <Text className="text-base text-center mb-6 text-gray-700">{message}</Text>
        <TouchableOpacity
          className="bg-[#1D4ED8] px-8 py-3 rounded-xl"
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold text-lg">OK</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
} 