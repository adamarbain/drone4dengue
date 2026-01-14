import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import BottomNav from './components/BottomNav';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../utils/userApi';
import { isTablet, getHorizontalPadding, getModalContainerStyle } from '../utils/responsive';
import FullScreenLoader from '../components/FullScreenLoader';
import { useMinimumLoadingTime } from '../utils/useMinimumLoadingTime';

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

type ReadStatus = 'all' | 'read' | 'unread';
type NotificationType = 'all' | 'prediction' | 'dengue_case' | 'drone' | 'drone_image' | 'location' | 'daily_prediction';

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  // const showLoader = useMinimumLoadingTime(loading, 1000);
  const [refreshing, setRefreshing] = useState(false);
  const [readStatusFilter, setReadStatusFilter] = useState<ReadStatus>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [readStatusFilter, typeFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const unreadOnly = readStatusFilter === 'unread';
      const readStatus = readStatusFilter !== 'all' ? readStatusFilter : null;
      const type = typeFilter !== 'all' ? typeFilter : null;
      
      // Type assertion needed because getNotifications accepts null but TypeScript infers string | null
      const response = await getNotifications(50, 0, unreadOnly, readStatus as any, type as any);
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

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      await markAllNotificationsAsRead();
      // Reload notifications to reflect changes
      await loadNotifications();
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
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const hasUnreadNotifications = notifications.some(n => !n.isRead);

  const getStatusLabel = (status: ReadStatus) => {
    switch (status) {
      case 'all': return 'All';
      case 'unread': return 'Unread';
      case 'read': return 'Read';
      default: return 'All';
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'all': return 'All';
      case 'prediction': return 'Prediction';
      case 'daily_prediction': return 'Daily Tips';
      case 'dengue_case': return 'Dengue Case';
      case 'drone': return 'Drone';
      case 'drone_image': return 'Drone Images';
      case 'location': return 'Location';
      default: return 'All';
    }
  };

  const getRiskIcon = (riskLevel: string, type: string) => {
    // Handle different notification types
    if (type === 'dengue_case' || type === 'drone' || type === 'drone_image' || type === 'location') {
      return (
        <View className="w-12 h-12 bg-[#1C4D8D] rounded-lg items-center justify-center">
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
            <Feather name="alert-triangle" size={24} color="#1C4D8D" />
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

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const tablet = isTablet();
  const iconSize = tablet ? 56 : 48;
  const riskIconSize = tablet ? 28 : 24;

  // if (showLoader) {
  //   return (
  //     <FullScreenLoader
  //       title="Loading notifications..."
  //       subtitle="Fetching your dengue risk alerts and updates"
  //     />
  //   );
  // }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <>
      {/* Header Container for Tablet Centering */}
      <View style={{ 
        width: '100%', 
        maxWidth: tablet ? 700 : undefined,
        alignSelf: 'center',
        paddingHorizontal: tablet ? getHorizontalPadding() : 0,
      }}>
        {/* Header */}
        <View style={{ paddingHorizontal: tablet ? 0 : 24, paddingTop: 16, paddingBottom: 16 }}>
          <View className="mb-4">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text 
                  className="font-extrabold" 
                  style={{ fontFamily: 'SF Pro', color: '#0F2854', fontSize: tablet ? 44 : 36 }}
                >
                  Notification
                </Text>
                <Text style={{ fontSize: tablet ? 16 : 14, marginTop: 4, color: 'rgba(15, 40, 84, 0.75)' }}>
                  View and keep track of your dengue risk alerts and updates
                </Text>
              </View>
              {hasUnreadNotifications && (
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  disabled={markingAllAsRead}
                  className="flex-row items-center bg-[#1C4D8D] rounded-lg"
                  style={{ paddingHorizontal: tablet ? 16 : 12, paddingVertical: tablet ? 12 : 8 }}
                >
                  {markingAllAsRead ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={tablet ? 20 : 16} color="#FFFFFF" />
                      <Text 
                        className="text-white font-semibold ml-1"
                        style={{ fontSize: tablet ? 16 : 14 }}
                      >
                        Mark All Read
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filters */}
          <View className="mb-4 flex-row">
            {/* Read Status Filter */}
            <View className="flex-1 mr-3">
              <Text className="font-semibold mb-2" style={{ color: '#0F2854', fontSize: tablet ? 16 : 14 }}>Notification Status</Text>
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  onPress={() => setShowStatusPicker(true)}
                  className="bg-white rounded-lg border border-gray-300 px-4 py-3 flex-row items-center justify-between"
                >
                  <Text className="text-base" style={{ color: '#0F2854' }}>{getStatusLabel(readStatusFilter)}</Text>
                  <Feather name="chevron-down" size={20} color="#4988C4" />
                </TouchableOpacity>
                <Modal
                  visible={showStatusPicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowStatusPicker(false)}
                >
                  <TouchableOpacity 
                    activeOpacity={1}
                    onPress={() => setShowStatusPicker(false)}
                    className="flex-1 justify-end"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                  >
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                      <View className="bg-white rounded-t-3xl" style={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: 16 }}>
                        <View className="flex-row justify-between items-center mb-4">
                          <Text className="text-lg font-semibold" style={{ color: '#0F2854' }}>Select Notification Status</Text>
                          <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                            <Text className="text-base font-semibold" style={{ color: '#1C4D8D' }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <View className="bg-gray-50 rounded-lg overflow-hidden">
                          <Picker
                            selectedValue={readStatusFilter}
                            onValueChange={(itemValue: ReadStatus) => setReadStatusFilter(itemValue)}
                            style={{ 
                              height: 200,
                              backgroundColor: '#F9FAFB',
                            }}
                            itemStyle={{
                              fontSize: 18,
                              color: '#181D27',
                            }}
                          >
                            <Picker.Item label="All" value="all" color="#181D27" />
                            <Picker.Item label="Unread" value="unread" color="#181D27" />
                            <Picker.Item label="Read" value="read" color="#181D27" />
                          </Picker>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              </>
            ) : (
              <View className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                <Picker
                  selectedValue={readStatusFilter}
                  onValueChange={(itemValue: ReadStatus) => setReadStatusFilter(itemValue)}
                  style={{
                    height: 50,
                    backgroundColor: 'transparent',
                  }}
                  dropdownIconColor="#1D4ED8"
                  mode="dropdown"
                >
                  <Picker.Item label="All" value="all" color="#181D27" />
                  <Picker.Item label="Unread" value="unread" color="#181D27" />
                  <Picker.Item label="Read" value="read" color="#181D27" />
                </Picker>
              </View>
            )}
          </View>

          {/* Type Filter */}
          <View className="flex-1">
            <Text className="font-semibold mb-2" style={{ color: '#0F2854', fontSize: tablet ? 16 : 14 }}>Notification Type</Text>
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  onPress={() => setShowTypePicker(true)}
                  className="bg-white rounded-lg border border-gray-300 px-4 py-3 flex-row items-center justify-between"
                >
                  <Text className="text-base" style={{ color: '#0F2854' }}>{getTypeLabel(typeFilter)}</Text>
                  <Feather name="chevron-down" size={20} color="#4988C4" />
                </TouchableOpacity>
                <Modal
                  visible={showTypePicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowTypePicker(false)}
                >
                  <TouchableOpacity 
                    activeOpacity={1}
                    onPress={() => setShowTypePicker(false)}
                    className="flex-1 justify-end"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                  >
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                      <View className="bg-white rounded-t-3xl" style={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: 16 }}>
                        <View className="flex-row justify-between items-center mb-4">
                          <Text className="text-lg font-semibold" style={{ color: '#0F2854' }}>Select Notification Type</Text>
                          <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                            <Text className="text-base font-semibold" style={{ color: '#1C4D8D' }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <View className="bg-gray-50 rounded-lg overflow-hidden">
                          <Picker
                            selectedValue={typeFilter}
                            onValueChange={(itemValue: NotificationType) => setTypeFilter(itemValue)}
                            style={{ 
                              height: 200,
                              backgroundColor: '#F9FAFB',
                            }}
                            itemStyle={{
                              fontSize: 18,
                              color: '#181D27',
                            }}
                          >
                            <Picker.Item label="All" value="all" color="#181D27" />
                            <Picker.Item label="Prediction" value="prediction" color="#181D27" />
                            <Picker.Item label="Daily Tips" value="daily_prediction" color="#181D27" />
                            <Picker.Item label="Dengue Case" value="dengue_case" color="#181D27" />
                            <Picker.Item label="Drone" value="drone" color="#181D27" />
                            <Picker.Item label="Drone Images" value="drone_image" color="#181D27" />
                            <Picker.Item label="Location" value="location" color="#181D27" />
                          </Picker>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              </>
            ) : (
              <View className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                <Picker
                  selectedValue={typeFilter}
                  onValueChange={(itemValue: NotificationType) => setTypeFilter(itemValue)}
                  style={{
                    height: 50,
                    backgroundColor: 'transparent',
                  }}
                  dropdownIconColor="#1D4ED8"
                  mode="dropdown"
                >
                  <Picker.Item label="All" value="all" color="#181D27" />
                  <Picker.Item label="Prediction" value="prediction" color="#181D27" />
                  <Picker.Item label="Daily Tips" value="daily_prediction" color="#181D27" />
                  <Picker.Item label="Dengue Case" value="dengue_case" color="#181D27" />
                  <Picker.Item label="Drone" value="drone" color="#181D27" />
                  <Picker.Item label="Drone Images" value="drone_image" color="#181D27" />
                  <Picker.Item label="Location" value="location" color="#181D27" />
                </Picker>
              </View>
            )}
          </View>
        </View>
      </View>
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Feather name="bell-off" size={tablet ? 64 : 48} color="#9CA3AF" />
          <Text className="text-gray-600 mt-4" style={{ fontSize: tablet ? 18 : 16 }}>No notifications</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ 
            paddingBottom: 100,
            alignItems: tablet ? 'center' : undefined,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={{ 
            width: '100%', 
            maxWidth: tablet ? 700 : undefined,
            paddingHorizontal: tablet ? getHorizontalPadding() : 0,
          }}>
            {notifications.map((notification, index) => (
              <View key={notification.id}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleNotificationPress(notification)}
                  className={`rounded-2xl ${notification.isRead ? 'bg-white' : 'bg-white'}`}
                  style={{
                    marginHorizontal: tablet ? 0 : 16,
                    padding: tablet ? 20 : 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    borderLeftWidth: notification.isRead ? 0 : 4,
                    borderLeftColor: '#4988C4',
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
                      <Text 
                        className="font-bold mb-2" 
                        style={{ 
                          fontFamily: 'SF Pro', 
                          color: notification.isRead ? 'rgba(15, 40, 84, 0.65)' : '#0F2854',
                          fontSize: tablet ? 18 : 16 
                        }}
                      >
                        {notification.title}
                      </Text>

                      {/* Message */}
                      <Text className="mb-2" style={{ color: 'rgba(15, 40, 84, 0.8)', fontSize: tablet ? 16 : 14 }}>
                        {notification.message}
                      </Text>

                      {/* Recommendations if available (for daily_prediction) */}
                      {notification.metadata?.recommendations && notification.metadata.recommendations.length > 0 && (
                        <View className="mt-2 mb-1">
                          <Text className="font-semibold mb-1" style={{ color: 'rgba(15, 40, 84, 0.75)', fontSize: tablet ? 14 : 12 }}>Recommendations:</Text>
                          {notification.metadata.recommendations.slice(0, 2).map((rec: any, idx: number) => (
                            <Text key={idx} className="ml-2" style={{ color: 'rgba(15, 40, 84, 0.75)', fontSize: tablet ? 14 : 12 }}>
                              • {rec.title}
                            </Text>
                          ))}
                        </View>
                      )}

                      {/* Location if available */}
                      {notification.location && notification.type !== 'daily_prediction' && (
                        <View className="flex-row items-center mb-1">
                          <Feather name="map-pin" size={tablet ? 18 : 14} color="#4988C4" />
                          <Text className="ml-2" style={{ color: 'rgba(15, 40, 84, 0.8)', fontSize: tablet ? 16 : 14 }}>{notification.location}</Text>
                        </View>
                      )}
                    </View>

                    {/* Time / Date */}
                    <View className="ml-2">
                      <Text style={{ color: 'rgba(15, 40, 84, 0.5)', fontSize: tablet ? 14 : 12 }}>
                        {(() => {
                          const createdDate = new Date(notification.createdAt);
                          return isToday(createdDate)
                            ? formatTime(createdDate)
                            : formatDate(createdDate);
                        })()}
                      </Text>
                      {!notification.isRead && (
                        <View 
                          className="bg-[#4988C4] rounded-full mt-1 ml-auto" 
                          style={{ width: tablet ? 10 : 8, height: tablet ? 10 : 8 }}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Separator Line */}
                {index < notifications.length - 1 && (
                  <View className="h-px bg-black" style={{ opacity: 0.1, marginHorizontal: tablet ? 0 : 16 }} />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <BottomNav />
      </>
    </SafeAreaView>
  );
}
