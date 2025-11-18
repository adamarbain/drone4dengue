"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { FiSearch, FiLogOut, FiBell, FiMail, FiChevronDown, FiAlertCircle, FiCheckCircle, FiMapPin, FiCamera, FiPackage } from "react-icons/fi"
import { useAuth } from '@/context/AuthContext';
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, type Notification } from '@/lib/api';
import { setAuthToken } from '@/lib/api';

export default function AdminHeader() {
  const [showNotifications, setShowNotifications] = useState(false)
  const { logout, user, token, companyId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [userData, setUserData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch notifications
  useEffect(() => {
    if (token) {
      setAuthToken(token);
      fetchNotifications();
      fetchUnreadCount();
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [token]);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setLoadingNotifications(true);
      const response = await getNotifications(5, 0, false);
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'prediction':
      case 'daily_prediction':
        return <FiAlertCircle className="text-[#A21C1C]" />;
      case 'dengue_case':
        return <FiAlertCircle className="text-red-600" />;
      case 'drone':
        return <FiPackage className="text-[#A21C1C]" />;
      case 'drone_image':
        return <FiCamera className="text-[#A21C1C]" />;
      case 'location':
        return <FiMapPin className="text-[#A21C1C]" />;
      default:
        return <FiAlertCircle className="text-[#A21C1C]" />;
    }
  };

  const getNotificationTitle = (notification: Notification): string => {
    if (notification.metadata?.location) {
      return `${notification.title} - ${notification.metadata.location}`;
    }
    return notification.title;
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''} ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Fetch user and company data on mount or when user/token/companyId changes
  useEffect(() => {
    async function fetchUserAndCompany() {
      if (!user?.id || !token) return;
      setProfileLoading(true);
      setProfileError('');
      setProfileSuccess('');
      try {
        // Fetch user data
        const userRes = await fetch(`${API_URL}/users/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userRes.ok) throw new Error('Failed to fetch user');
        const userData = await userRes.json();
        setUserData(userData.user);
        console.log('User Data:', userData);
        
        // Fetch company data if companyId is available
        if (companyId) {
          const companyRes = await fetch(`${API_URL}/companies/${companyId}/getcompanybyId`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (companyRes.ok) {
            const companyData = await companyRes.json();
            setCompanyData(companyData);
          } else {
            // Log error details for debugging
            const errorData = await companyRes.json().catch(() => ({ error: 'Unknown error' }));
            console.error('[AdminHeader] Failed to fetch company:', {
              status: companyRes.status,
              statusText: companyRes.statusText,
              error: errorData,
              companyId,
              apiUrl: API_URL
            });
            setProfileError(`Failed to fetch company: ${errorData.error || companyRes.statusText}`);
          }
        }
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Failed to fetch user');
      } finally {
        setProfileLoading(false);
      }
    }
    fetchUserAndCompany();
  }, [user?.id, token, companyId]);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-white border-b border-[#E2C275]/50 shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFF7E3] rounded-lg">
          <span className="text-[#A21C1C] font-medium text-sm">
            {profileLoading ? 'Loading Company...' : userData?.organization || 'Company Portal'}
          </span>
          <div className="w-2 h-2 rounded-full bg-[#A21C1C] animate-pulse"></div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="flex items-center bg-[#F9F6F2] rounded-lg focus-within:ring-2 focus-within:ring-[#E2C275] transition-all">
            <FiSearch className="ml-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none text-sm py-2 px-3 w-56 focus:outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-full hover:bg-[#FFF7E3] transition-colors">
            <FiMail className="text-[#A21C1C] w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E2C275] rounded-full text-[10px] flex items-center justify-center font-bold">
              3
            </span>
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              className="relative p-2 rounded-full hover:bg-[#FFF7E3] transition-colors"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  fetchNotifications();
                }
              }}
            >
              <FiBell className="text-[#A21C1C] w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E2C275] rounded-full text-[10px] flex items-center justify-center font-bold text-[#A21C1C]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-gray-500">{unreadCount} unread</span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3 hover:bg-[#FFF7E3] border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                          !notification.isRead ? 'bg-[#FFF7E3]/50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#A21C1C]/10 flex items-center justify-center flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${!notification.isRead ? 'text-[#A21C1C]' : 'text-gray-900'}`}>
                              {getNotificationTitle(notification)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-[#A21C1C] rounded-full flex-shrink-0 mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button 
                      className="text-[#A21C1C] text-xs font-medium hover:underline w-full text-center"
                      onClick={() => {
                        // Navigate to full notifications page if it exists
                        window.location.href = '/notifications';
                      }}
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          <button className="flex items-center gap-2 bg-[#A21C1C] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#7C1D1D] transition-colors" onClick={logout}>
            <FiLogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>

          <div className="flex items-center gap-3 pl-3">
            <div className="flex flex-col items-end">
              <span className="font-medium text-sm">{userData?.name || 'User'}</span>
              <span className="text-xs text-gray-500">Administrator</span>
            </div>
            <div className="relative">
              <Image
                src="/images/profile.jpg"
                alt="Profile"
                width={40}
                height={40}
                className="rounded-full border-2 border-[#E2C275] object-cover"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <FiChevronDown className="text-gray-400 w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  )
}
