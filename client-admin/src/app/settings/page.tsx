"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FiSave, FiEdit2, FiLock, FiMail, FiUser, FiSettings, FiSliders, FiRefreshCw, FiMapPin, FiPlus, FiEdit3, FiTrash2 } from "react-icons/fi"
import MapPicker from "@/components/MapPicker"
import { useAuth } from '@/context/AuthContext';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SettingsPage() {
  const [profileEditable, setProfileEditable] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [alertFrequency, setAlertFrequency] = useState("immediate")
  const [alertThreshold, setAlertThreshold] = useState("medium")
  const [syncMode, setSyncMode] = useState("automatic")

  // Auth context
  const { user, token } = useAuth();

  // User profile state
  const [userData, setUserData] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', username: '', email: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const company = useAuth().company;

  // Password update state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Company locations state
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [locationForm, setLocationForm] = useState({ name: '', address: '', latitude: '', longitude: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');

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
        setProfileForm({
          name: data.user.name || '',
          username: data.user.username || '',
          email: data.user.email || '',
          phone: data.user.phone || ''
        });
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Failed to fetch user');
      } finally {
        setProfileLoading(false);
      }
    }
    fetchUser();
  }, [user?.id, token]);

  // Fetch company locations
  useEffect(() => {
    async function fetchLocations() {
      if (!token) return;
      setLocationsLoading(true);
      setLocationsError('');
      try {
        const res = await fetch(`${API_URL}/company-locations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch locations');
        const data = await res.json();
        setLocations(data);
      } catch (err) {
        setLocationsError(err instanceof Error ? err.message : 'Failed to fetch locations');
      } finally {
        setLocationsLoading(false);
      }
    }
    fetchLocations();
  }, [token]);

  // Handle profile form changes
  function handleProfileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  }

  // Handle profile save
  async function handleProfileSave() {
    setProfileError('');
    setProfileSuccess('');
    try {
      if (!user?.id || !token) throw new Error('No user ID or token found');
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          username: profileForm.username,
          phone: profileForm.phone,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update profile');
      }
      const data = await res.json();
      setUserData(data.user);
      setProfileSuccess('Profile updated successfully!');
      setProfileEditable(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }

  // Handle password update
  async function handlePasswordUpdate() {
    setPasswordError('');
    setPasswordSuccess('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (!user?.id || !token) {
      setPasswordError('No user ID or token found.');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${user.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update password');
      }
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  }

  // Handle location form changes
  function handleLocationChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocationForm({ ...locationForm, [e.target.name]: e.target.value });
  }

  // Handle add/edit location
  async function handleLocationSave() {
    setLocationError('');
    setLocationSuccess('');
    if (!locationForm.name.trim()) {
      setLocationError('Location name is required.');
      return;
    }
    if (!token) {
      setLocationError('No token found.');
      return;
    }
    setLocationLoading(true);
    try {
      const url = editingLocation 
        ? `${API_URL}/company-locations/${editingLocation.id}`
        : `${API_URL}/company-locations`;
      const method = editingLocation ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: locationForm.name.trim(),
          address: locationForm.address.trim() || null,
          latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${editingLocation ? 'update' : 'create'} location`);
      }
      setLocationSuccess(`Location ${editingLocation ? 'updated' : 'created'} successfully!`);
      setLocationForm({ name: '', address: '', latitude: '', longitude: '' });
      setShowAddLocation(false);
      setEditingLocation(null);
      // Refresh locations
      const refreshRes = await fetch(`${API_URL}/company-locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setLocations(data);
      }
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : `Failed to ${editingLocation ? 'update' : 'create'} location`);
    } finally {
      setLocationLoading(false);
    }
  }

  // Handle edit location
  function handleEditLocation(location: any) {
    setEditingLocation(location);
    setLocationForm({
      name: location.name || '',
      address: location.address || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || '',
    });
    setShowAddLocation(true);
  }

  // Handle cancel location form
  function handleCancelLocation() {
    setLocationForm({ name: '', address: '', latitude: '', longitude: '' });
    setShowAddLocation(false);
    setEditingLocation(null);
    setLocationError('');
    setLocationSuccess('');
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row  border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Settings" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <motion.section className="px-10 py-6" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">Settings</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">Manage your account and system preferences</div>
            </div>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Settings */}
            <motion.div variants={item}>
              <Card className="bg-white shadow-md rounded-xl overflow-hidden">
                <div className="bg-[#F3EAD8] px-6 py-4 border-b border-[#E2C275]">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiUser className="text-[#A21C1C]" />
                    Profile Settings
                  </h2>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Profile Information</h3>
                      <button
                        onClick={() => setProfileEditable(!profileEditable)}
                        className="flex items-center gap-2 text-[#A21C1C] hover:bg-[#F3EAD8] p-2 rounded-lg"
                        disabled={profileLoading}
                      >
                        <FiEdit2 />
                        <span>{profileEditable ? "Cancel" : "Edit Profile"}</span>
                      </button>
                    </div>

                    {profileLoading ? (
                      <div className="text-gray-500">Loading...</div>
                    ) : profileError ? (
                      <div className="text-red-600">{profileError}</div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            name="name"
                            value={profileForm.name}
                            onChange={handleProfileChange}
                            disabled={!profileEditable}
                            className={`${!profileEditable ? "bg-gray-100 text-gray-700" : "border-[#E2C275] focus:border-[#A21C1C]"}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            name="username"
                            value={profileForm.username}
                            onChange={handleProfileChange}
                            disabled={!profileEditable}
                            className={`${!profileEditable ? "bg-gray-100 text-gray-700" : "border-[#E2C275] focus:border-[#A21C1C]"}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            value={profileForm.email}
                            onChange={handleProfileChange}
                            disabled={true}
                            className={"bg-gray-100 text-gray-700"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={profileForm.phone}
                            onChange={handleProfileChange}
                            disabled={!profileEditable}
                            className={`${!profileEditable ? "bg-gray-100 text-gray-700" : "border-[#E2C275] focus:border-[#A21C1C]"}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            name="company"
                            value={company?.name}
                            onChange={handleProfileChange}
                            disabled={true}
                            className={`${!profileEditable ? "bg-gray-100 text-gray-700" : "border-[#E2C275] focus:border-[#A21C1C]"}`}
                          />
                        </div>
                      </>
                    )}

                    {profileEditable && !profileLoading && (
                      <div className="pt-4">
                        <button
                          className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2"
                          onClick={handleProfileSave}
                          disabled={profileLoading}
                        >
                          <FiSave />
                          Save Changes
                        </button>
                      </div>
                    )}
                    {profileSuccess && <div className="text-green-600 mt-2">{profileSuccess}</div>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Password Settings */}
            <motion.div variants={item}>
              <Card className="bg-white shadow-md rounded-xl overflow-hidden">
                <div className="bg-[#F3EAD8] px-6 py-4 border-b border-[#E2C275]">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiLock className="text-[#A21C1C]" />
                    Password Settings
                  </h2>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="border-[#E2C275] bg-gray-100 text-gray-700"
                        autoComplete="current-password"
                        disabled={true}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="border-[#E2C275] focus:border-[#A21C1C]"
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="border-[#E2C275] focus:border-[#A21C1C]"
                        autoComplete="new-password"
                      />
                    </div>
                    {passwordError && <div className="text-red-600 mt-2">{passwordError}</div>}
                    {passwordSuccess && <div className="text-green-600 mt-2">{passwordSuccess}</div>}
                    <div className="pt-4">
                      <button
                        className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2"
                        onClick={handlePasswordUpdate}
                        disabled={passwordLoading}
                      >
                        <FiLock />
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notification Preferences */}
            <motion.div variants={item}>
              <Card className="bg-white shadow-md rounded-xl overflow-hidden">
                <div className="bg-[#F3EAD8] px-6 py-4 border-b border-[#E2C275]">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiMail className="text-[#A21C1C]" />
                    Notification Preferences
                  </h2>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Email Notifications</h3>
                        <p className="text-sm text-gray-500">Receive alerts and updates via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={() => setEmailNotifications(!emailNotifications)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A21C1C]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">SMS Notifications</h3>
                        <p className="text-sm text-gray-500">Receive alerts and updates via SMS</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smsNotifications}
                          onChange={() => setSmsNotifications(!smsNotifications)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A21C1C]"></div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="alert-frequency">Alert Frequency</Label>
                      <select
                        id="alert-frequency"
                        value={alertFrequency}
                        onChange={(e) => setAlertFrequency(e.target.value)}
                        className="w-full rounded-lg border border-[#E2C275] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#A21C1C]"
                      >
                        <option value="immediate">Immediate</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>

                    <div className="pt-4">
                      <button className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2">
                        <FiSave />
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* System Configuration */}
            <motion.div variants={item}>
              <Card className="bg-white shadow-md rounded-xl overflow-hidden">
                <div className="bg-[#F3EAD8] px-6 py-4 border-b border-[#E2C275]">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiSettings className="text-[#A21C1C]" />
                    System Configuration
                  </h2>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="alert-threshold">Dengue Alert Threshold</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="threshold"
                            value="low"
                            checked={alertThreshold === "low"}
                            onChange={() => setAlertThreshold("low")}
                            className="accent-[#A21C1C]"
                          />
                          <span>Low</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="threshold"
                            value="medium"
                            checked={alertThreshold === "medium"}
                            onChange={() => setAlertThreshold("medium")}
                            className="accent-[#A21C1C]"
                          />
                          <span>Medium</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="threshold"
                            value="high"
                            checked={alertThreshold === "high"}
                            onChange={() => setAlertThreshold("high")}
                            className="accent-[#A21C1C]"
                          />
                          <span>High</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="prediction-model">Prediction Model Parameters</Label>
                        <button className="text-[#A21C1C] hover:bg-[#F3EAD8] p-2 rounded-lg flex items-center gap-1">
                          <FiSliders className="text-sm" />
                          <span className="text-sm">Edit Parameters</span>
                        </button>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-600">
                        <div className="flex justify-between mb-1">
                          <span>Temperature Weight:</span>
                          <span>0.35</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>Rainfall Weight:</span>
                          <span>0.40</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Population Density Weight:</span>
                          <span>0.25</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data-sync">Data Synchronization</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="sync"
                            value="automatic"
                            checked={syncMode === "automatic"}
                            onChange={() => setSyncMode("automatic")}
                            className="accent-[#A21C1C]"
                          />
                          <span>Automatic</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="sync"
                            value="manual"
                            checked={syncMode === "manual"}
                            onChange={() => setSyncMode("manual")}
                            className="accent-[#A21C1C]"
                          />
                          <span>Manual</span>
                        </label>
                      </div>
                      {syncMode === "manual" && (
                        <button className="mt-2 bg-[#E5E7EB] text-black px-4 py-1 rounded-lg text-sm hover:bg-[#F3EAD8] flex items-center gap-1">
                          <FiRefreshCw className="text-xs" />
                          Sync Now
                        </button>
                      )}
                    </div>

                    <div className="pt-4">
                      <button className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2">
                        <FiSettings />
                        Apply Settings
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Company Locations */}
          <motion.div variants={item} className="mt-8">
            <Card className="bg-white shadow-md rounded-xl overflow-hidden">
              <div className="bg-[#F3EAD8] px-6 py-4 border-b border-[#E2C275]">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiMapPin className="text-[#A21C1C]" />
                    Company Locations
                  </h2>
                  <button
                    onClick={() => setShowAddLocation(true)}
                    className="bg-[#A21C1C] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#7C1D1D] flex items-center gap-2"
                  >
                    <FiPlus />
                    Add Location
                  </button>
                </div>
              </div>
              <CardContent className="p-6">
                {locationsLoading ? (
                  <div className="text-gray-500 text-center py-8">Loading locations...</div>
                ) : locationsError ? (
                  <div className="text-red-600 text-center py-8">{locationsError}</div>
                ) : locations.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No locations found. Add your first location to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {locations.map((location: any) => (
                      <div key={location.id} className="border border-[#E2C275] rounded-lg p-4 bg-[#F9F6F2]">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-800">{location.name}</h3>
                            {location.address && (
                              <p className="text-gray-600 mt-1">{location.address}</p>
                            )}
                            {(location.latitude && location.longitude) && (
                              <p className="text-sm text-gray-500 mt-1">
                                Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                location.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {location.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Created: {new Date(location.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEditLocation(location)}
                              className="text-[#A21C1C] hover:bg-[#F3EAD8] p-2 rounded-lg"
                              title="Edit location"
                            >
                              <FiEdit3 />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add/Edit Location Form */}
                {showAddLocation && (
                  <div className="mt-6 border-t border-[#E2C275] pt-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingLocation ? 'Edit Location' : 'Add New Location'}
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-name">Location Name *</Label>
                          <Input
                            id="location-name"
                            name="name"
                            value={locationForm.name}
                            onChange={handleLocationChange}
                            placeholder="Enter location name"
                            className="border-[#E2C275] focus:border-[#A21C1C]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-address">Address</Label>
                          <Input
                            id="location-address"
                            name="address"
                            value={locationForm.address}
                            onChange={handleLocationChange}
                            placeholder="Enter address (optional)"
                            className="border-[#E2C275] focus:border-[#A21C1C]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-latitude">Latitude</Label>
                          <Input
                            id="location-latitude"
                            name="latitude"
                            type="number"
                            step="any"
                            value={locationForm.latitude}
                            onChange={handleLocationChange}
                            placeholder="Enter latitude (optional)"
                            className="border-[#E2C275] focus:border-[#A21C1C]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-longitude">Longitude</Label>
                          <Input
                            id="location-longitude"
                            name="longitude"
                            type="number"
                            step="any"
                            value={locationForm.longitude}
                            onChange={handleLocationChange}
                            placeholder="Enter longitude (optional)"
                            className="border-[#E2C275] focus:border-[#A21C1C]"
                          />
                        </div>
                      </div>

                      {/* Map picker to select coordinates */}
                      <div className="space-y-2">
                        <Label>Pin Exact Location on Map</Label>
                        <MapPicker
                          value={(() => {
                            const lat = parseFloat(locationForm.latitude as unknown as string)
                            const lng = parseFloat(locationForm.longitude as unknown as string)
                            return isNaN(lat) || isNaN(lng) ? null : { lat, lng }
                          })()}
                          onChange={async (coords) => {
                            setLocationForm(prev => ({
                              ...prev,
                              latitude: coords.lat.toString(),
                              longitude: coords.lng.toString(),
                            }))
                            try {
                              const res = await fetch(`${API_URL}/geocode/reverse?lat=${coords.lat}&lon=${coords.lng}`, {
                                headers: { 'Accept': 'application/json' }
                              })
                              if (res.ok) {
                                const data = await res.json()
                                const display = data?.display_name || ''
                                if (display) {
                                  setLocationForm(prev => ({ ...prev, address: display }))
                                }
                              }
                            } catch {
                              // ignore reverse geocode errors silently
                            }
                          }}
                          height={360}
                        />
                        <p className="text-xs text-gray-500">
                          Selected: {locationForm.latitude || '-'}, {locationForm.longitude || '-'}
                        </p>
                      </div>
                      
                      {locationError && <div className="text-red-600">{locationError}</div>}
                      {locationSuccess && <div className="text-green-600">{locationSuccess}</div>}
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleLocationSave}
                          disabled={locationLoading}
                          className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2 disabled:opacity-50"
                        >
                          <FiSave />
                          {locationLoading ? 'Saving...' : (editingLocation ? 'Update Location' : 'Add Location')}
                        </button>
                        <button
                          onClick={handleCancelLocation}
                          className="bg-gray-500 text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Advanced Settings */}
          <motion.div variants={item} className="mt-8">
            <Card className="bg-white shadow-md rounded-xl overflow-hidden">
              <div className="bg-[#F3EAD8] px-6 py-4 border-b border-[#E2C275]">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FiSettings className="text-[#A21C1C]" />
                  Advanced Settings
                </h2>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-[#F9F6F2] rounded-lg">
                    <div>
                      <h3 className="font-semibold">Data Retention Policy</h3>
                      <p className="text-sm text-gray-500">Control how long data is stored in the system</p>
                    </div>
                    <button className="bg-[#E5E7EB] text-black px-4 py-2 rounded-lg text-sm hover:bg-[#F3EAD8]">
                      Configure
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-[#F9F6F2] rounded-lg">
                    <div>
                      <h3 className="font-semibold">API Access</h3>
                      <p className="text-sm text-gray-500">Manage API keys and access permissions</p>
                    </div>
                    <button className="bg-[#E5E7EB] text-black px-4 py-2 rounded-lg text-sm hover:bg-[#F3EAD8]">
                      Manage Keys
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-[#F9F6F2] rounded-lg">
                    <div>
                      <h3 className="font-semibold">System Backup</h3>
                      <p className="text-sm text-gray-500">Configure automatic backups and restore points</p>
                    </div>
                    <button className="bg-[#E5E7EB] text-black px-4 py-2 rounded-lg text-sm hover:bg-[#F3EAD8]">
                      Backup Now
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>
      </main>
    </div>
  )
}
