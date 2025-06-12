"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { FiSearch, FiLogOut, FiBell, FiMail, FiChevronDown, FiAlertCircle } from "react-icons/fi"
import { useAuth } from '@/context/AuthContext';

export default function AdminHeader() {
  const [showNotifications, setShowNotifications] = useState(false)
  const { logout, user, token } = useAuth();

  const [userData, setUserData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const API_URL = 'http://localhost:4000';

  // Fetch user on mount or when user/token changes
  useEffect(() => {
    async function fetchUser() {
      if (!user?.id || !token) return;
      setProfileLoading(true);
      setProfileError('');
      setProfileSuccess('');
      try {
        const res = await fetch(`${API_URL}/users/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();
        setUserData(data.user);
        console.log(data.user);
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Failed to fetch user');
      } finally {
        setProfileLoading(false);
      }
    }
    fetchUser();
  }, [user?.id, token]);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-white border-b border-[#E2C275]/50 shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFF7E3] rounded-lg">
          <span className="text-[#A21C1C] font-medium text-sm">Admin Portal</span>
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

          <div className="relative">
            <button
              className="relative p-2 rounded-full hover:bg-[#FFF7E3] transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FiBell className="text-[#A21C1C] w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E2C275] rounded-full text-[10px] flex items-center justify-center font-bold">
                5
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-4 py-3 hover:bg-[#FFF7E3] border-b border-gray-100 last:border-0">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#A21C1C]/10 flex items-center justify-center flex-shrink-0">
                          <FiAlertCircle className="text-[#A21C1C]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">New dengue case reported</p>
                          <p className="text-xs text-gray-500">Petaling Jaya area - 10 min ago</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <button className="text-[#A21C1C] text-xs font-medium hover:underline w-full text-center">
                    View all notifications
                  </button>
                </div>
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
              <span className="font-medium text-sm">{userData?.username || 'User'}</span>
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
