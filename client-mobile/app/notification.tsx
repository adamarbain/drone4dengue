import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import BottomNav from './components/BottomNav';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../utils/userApi';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  riskLevel?: 'high' | 'medium' | 'low';
  location?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await getNotifications(50, 0, false);
      const formattedNotifications = response.notifications.map((notif: any) => ({
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        riskLevel: notif.metadata?.riskLevel || 'low',
        location: notif.metadata?.location || notif.message,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        metadata: notif.metadata
      }));
      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    // Update badge count after refreshing
    try {
      const { setBadgeCount } = require('../utils/pushNotifications');
      const { getUnreadNotificationCount } = require('../utils/userApi');
      const count = await getUnreadNotificationCount();
      await setBadgeCount(count);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        // Update badge count
        try {
          const { setBadgeCount } = require('../utils/pushNotifications');
          const { getUnreadNotificationCount } = require('../utils/userApi');
          const count = await getUnreadNotificationCount();
          await setBadgeCount(count);
        } catch (error) {
          console.error('Error updating badge count:', error);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const getRiskIcon = (riskLevel: string, type: string) => {
    // Handle different notification types
    if (type === 'dengue_case' || type === 'drone' || type === 'drone_image' || type === 'location') {
      return (
        <View className="w-12 h-12 bg-[#7D0A0A] rounded-lg items-center justify-center">
          <Feather name="bell" size={24} color="#FFFFFF" />
        </View>
      );
    }

    // For daily_prediction (recommendation-based), use a friendly icon
    if (type === 'daily_prediction') {
      return (
        <View className="w-12 h-12 bg-[#4CAF50] rounded-lg items-center justify-center">
          <Feather name="heart" size={24} color="#FFFFFF" />
        </View>
      );
    }

    switch (riskLevel) {
      case 'high':
        return (
          <View className="w-12 h-12 bg-[#BF3131] rounded-lg items-center justify-center">
            <Feather name="alert-triangle" size={24} color="#FFFFFF" />
          </View>
        );
      case 'medium':
        return (
          <View className="w-12 h-12 bg-[#EAD196] rounded-lg items-center justify-center">
            <Feather name="alert-triangle" size={24} color="#7D0A0A" />
          </View>
        );
      case 'low':
        return (
          <View className="w-12 h-12 bg-[#4CAF50] rounded-lg items-center justify-center">
            <Feather name="check-circle" size={24} color="#FFFFFF" />
          </View>
        );
      default:
        return (
          <View className="w-12 h-12 bg-gray-400 rounded-lg items-center justify-center">
            <Feather name="info" size={24} color="#FFFFFF" />
          </View>
        );
    }
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-4xl font-extrabold text-black" style={{ fontFamily: 'SF Pro' }}>
          Notification
        </Text>
      </View>

      {/* Notifications List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7D0A0A" />
          <Text className="text-gray-600 mt-4">Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Feather name="bell-off" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 mt-4 text-base">No notifications</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {notifications.map((notification, index) => (
            <View key={notification.id}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(notification)}
                className={`mx-4 rounded-2xl p-4 ${notification.isRead ? 'bg-gray-50' : 'bg-white'}`}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                  borderLeftWidth: notification.isRead ? 0 : 4,
                  borderLeftColor: '#7D0A0A',
                }}
              >
                <View className="flex-row items-start">
                  {/* Icon */}
                  <View className="mr-4">
                    {getRiskIcon(notification.riskLevel || 'low', notification.type)}
                  </View>

                  {/* Content */}
                  <View className="flex-1">
                    {/* Title */}
                    <Text className={`text-base font-bold mb-2 ${notification.isRead ? 'text-gray-600' : 'text-black'}`} style={{ fontFamily: 'SF Pro' }}>
                      {notification.title}
                    </Text>

                    {/* Message */}
                    <Text className="text-sm text-gray-700 mb-2">
                      {notification.message}
                    </Text>

                    {/* Recommendations if available (for daily_prediction) */}
                    {notification.metadata?.recommendations && notification.metadata.recommendations.length > 0 && (
                      <View className="mt-2 mb-1">
                        <Text className="text-xs text-gray-600 font-semibold mb-1">Recommendations:</Text>
                        {notification.metadata.recommendations.slice(0, 2).map((rec: any, idx: number) => (
                          <Text key={idx} className="text-xs text-gray-600 ml-2">
                            • {rec.title}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Location if available */}
                    {notification.location && notification.type !== 'daily_prediction' && (
                      <View className="flex-row items-center mb-1">
                        <Feather name="map-pin" size={14} color="#BF3131" />
                        <Text className="text-sm text-gray-700 ml-2">{notification.location}</Text>
                      </View>
                    )}

                    {/* Type */}
                    <View className="flex-row items-center">
                      <Feather name="tag" size={14} color="#BF3131" />
                      <Text className="text-sm text-gray-700 ml-2 capitalize">{notification.type.replace('_', ' ')}</Text>
                    </View>
                  </View>

                  {/* Time */}
                  <View className="ml-2">
                    <Text className="text-xs text-gray-500">
                      {formatTime(new Date(notification.createdAt))}
                    </Text>
                    {!notification.isRead && (
                      <View className="w-2 h-2 bg-[#7D0A0A] rounded-full mt-1 ml-auto" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Separator Line */}
              {index < notifications.length - 1 && (
                <View className="h-px bg-black mx-4" style={{ opacity: 0.1 }} />
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}
