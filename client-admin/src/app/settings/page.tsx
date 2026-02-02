"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FiSave, FiEdit2, FiLock, FiMail, FiUser, FiSettings, FiSliders, FiRefreshCw, FiMapPin, FiPlus, FiTrash2, FiSend, FiBell, FiEye, FiEyeOff, FiCheckCircle, FiX } from "react-icons/fi"
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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  exit: { opacity: 0, scale: 0.8, y: 50, transition: { duration: 0.2 } },
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SettingsPage() {
  const [profileEditable, setProfileEditable] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [alertFrequency, setAlertFrequency] = useState("immediate")
  const [alertThreshold, setAlertThreshold] = useState("medium")
  const [syncMode, setSyncMode] = useState("automatic")

  // Success Dialog State
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState("");

  // Auth context
  const { user, token } = useAuth();

  // User profile state
  const [userData, setUserData] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ name: '', username: '', email: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const company = useAuth().company;

  // Company settings state
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [companySettingsLoading, setCompanySettingsLoading] = useState(true);
  const [companySettingsError, setCompanySettingsError] = useState('');
  
  // Notification preferences state
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationSuccess, setNotificationSuccess] = useState('');

  // System configuration state
  const [systemConfigLoading, setSystemConfigLoading] = useState(false);
  const [systemConfigError, setSystemConfigError] = useState('');
  const [systemConfigSuccess, setSystemConfigSuccess] = useState('');
  const [predictionModelParams, setPredictionModelParams] = useState({
    temperatureWeight: 0.35,
    rainfallWeight: 0.40,
    populationDensityWeight: 0.25,
    lowThreshold: 1.0,  // Risk score threshold for low to medium
    highThreshold: 3.0   // Risk score threshold for medium to high
  });
  const [showModelParamsEdit, setShowModelParamsEdit] = useState(false);
  const [showRiskThresholdsEdit, setShowRiskThresholdsEdit] = useState(false);

  // Advanced settings state
  const [advancedSettingsLoading, setAdvancedSettingsLoading] = useState(false);
  const [advancedSettingsError, setAdvancedSettingsError] = useState('');
  const [advancedSettingsSuccess, setAdvancedSettingsSuccess] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState<any>({
    dataRetentionPolicy: {},
    apiAccess: {},
    systemBackup: {}
  });

  // Password update state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const isPasswordValid = (value: string) => /^(?=.*\d).{8,}$/.test(value);
  const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isPhoneValid = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    return digitsOnly.length >= 8 && digitsOnly.length <= 15;
  };

  // Company locations state
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({ name: '', address: '', latitude: '', longitude: '', isActive: true });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  // Broadcast notification state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState('');
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

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

  // Fetch company settings
  useEffect(() => {
    async function fetchCompanySettings() {
      if (!company?.id || !token) return;
      setCompanySettingsLoading(true);
      setCompanySettingsError('');
      try {
        const res = await fetch(`${API_URL}/companies/${company.id}/getcompanybyId`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch company settings');
        const data = await res.json();
        setCompanySettings(data);
        
        // Update local state from company settings
        if (data.emailNotifications !== undefined) setEmailNotifications(data.emailNotifications);
        if (data.smsNotifications !== undefined) setSmsNotifications(data.smsNotifications);
        if (data.alertFrequency) setAlertFrequency(data.alertFrequency);
        if (data.alertThreshold) setAlertThreshold(data.alertThreshold);
        if (data.syncMode) setSyncMode(data.syncMode);
        if (data.predictionModelParameters) {
          setPredictionModelParams({
            temperatureWeight: data.predictionModelParameters.temperatureWeight || 0.35,
            rainfallWeight: data.predictionModelParameters.rainfallWeight || 0.40,
            populationDensityWeight: data.predictionModelParameters.populationDensityWeight || 0.25,
            lowThreshold: data.predictionModelParameters.lowThreshold || 1.0,
            highThreshold: data.predictionModelParameters.highThreshold || 3.0
          });
        }
        if (data.advancedSettings) {
          setAdvancedSettings(data.advancedSettings);
        }
      } catch (err) {
        setCompanySettingsError(err instanceof Error ? err.message : 'Failed to fetch company settings');
      } finally {
        setCompanySettingsLoading(false);
      }
    }
    fetchCompanySettings();
  }, [company?.id, token]);

  // Handle profile form changes
  function handleProfileChange(e: React.ChangeEvent<HTMLInputElement>) {
  setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  setProfileFieldErrors((prev) => {
    const next = { ...prev };
    delete next[e.target.name];
    return next;
  });
  }

  // Toggle profile edit mode and handle cancel/revert
  function handleToggleProfileEdit() {
    if (profileEditable) {
      // Revert changes when canceling
      if (userData) {
        setProfileForm({
          name: userData.name || '',
          username: userData.username || '',
          email: userData.email || '',
          phone: userData.phone || ''
        });
      }
      setProfileFieldErrors({});
      setProfileEditable(false);
    } else {
      setProfileEditable(true);
    }
  }

  // Handle profile save
  async function handleProfileSave() {
    setProfileError('');
    setProfileSuccess('');
  const fieldErrors: Record<string, string> = {};
  if (!profileForm.name.trim()) fieldErrors.name = 'Please fill out this field';
  if (!profileForm.username.trim()) fieldErrors.username = 'Please fill out this field';
  if (!profileForm.email.trim()) fieldErrors.email = 'Please fill out this field';
  else if (!isEmailValid(profileForm.email)) fieldErrors.email = 'Invalid email format.';
  if (!profileForm.phone.trim()) fieldErrors.phone = 'Please fill out this field';
  else if (!isPhoneValid(profileForm.phone)) fieldErrors.phone = 'Invalid number format.';

  if (Object.keys(fieldErrors).length > 0) {
    setProfileFieldErrors(fieldErrors);
    return;
  } else {
    setProfileFieldErrors({});
  }
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
    if (!isPasswordValid(newPassword)) {
      setPasswordError('Password must be at least 8 characters, including a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The passwords do not match.');
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
      const res = await fetch(`${API_URL}/company-locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: locationForm.name.trim(),
          address: locationForm.address.trim() || null,
          latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
          isActive: locationForm.isActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create location');
      }
      
      const successMsg = 'Location created successfully!';
      setSuccessDialogMessage(successMsg);
      setShowSuccessDialog(true);
      
      setLocationForm({ name: '', address: '', latitude: '', longitude: '', isActive: true });
      setShowAddLocation(false);
      // Refresh locations
      const refreshRes = await fetch(`${API_URL}/company-locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setLocations(data);
      }
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setLocationLoading(false);
    }
  }

  // Handle delete location
  async function handleDeleteLocation(locationId: string) {
    if (!token) {
      setLocationError('No token found.');
      return;
    }
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Are you sure you want to delete this location? This cannot be undone.')
      : true;
    if (!confirmed) return;

    setLocationError('');
    setDeleteLoadingId(locationId);
    try {
      const res = await fetch(`${API_URL}/company-locations/${locationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete location');
      }

      setSuccessDialogMessage('Location deleted successfully!');
      setShowSuccessDialog(true);

      const refreshRes = await fetch(`${API_URL}/company-locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setLocations(data);
      }
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Failed to delete location');
    } finally {
      setDeleteLoadingId(null);
    }
  }

  // Handle cancel location form
  function handleCancelLocation() {
    setLocationForm({ name: '', address: '', latitude: '', longitude: '', isActive: true });
    setShowAddLocation(false);
    setLocationError('');
  }

  // Handle save notification preferences
  async function handleSaveNotificationPreferences() {
    if (!company?.id || !token) {
      setNotificationError('No company ID or token found.');
      return;
    }
    setNotificationLoading(true);
    setNotificationError('');
    setNotificationSuccess('');
    try {
      const res = await fetch(`${API_URL}/companies/${company.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailNotifications,
          smsNotifications,
          alertFrequency,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update notification preferences');
      }
      const data = await res.json();
      setCompanySettings(data);
      setNotificationSuccess('Notification preferences saved successfully!');
      setTimeout(() => setNotificationSuccess(''), 3000);
    } catch (err) {
      setNotificationError(err instanceof Error ? err.message : 'Failed to update notification preferences');
    } finally {
      setNotificationLoading(false);
    }
  }

  // Handle save system configuration
  async function handleSaveSystemConfiguration() {
    if (!company?.id || !token) {
      setSystemConfigError('No company ID or token found.');
      return;
    }
    setSystemConfigLoading(true);
    setSystemConfigError('');
    setSystemConfigSuccess('');
    try {
      const res = await fetch(`${API_URL}/companies/${company.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          alertThreshold,
          predictionModelParameters: predictionModelParams,
          syncMode,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update system configuration');
      }
      const data = await res.json();
      setCompanySettings(data);
      setSystemConfigSuccess('System configuration saved successfully!');
      setShowModelParamsEdit(false);
      setShowRiskThresholdsEdit(false);
      setTimeout(() => setSystemConfigSuccess(''), 3000);
    } catch (err) {
      setSystemConfigError(err instanceof Error ? err.message : 'Failed to update system configuration');
    } finally {
      setSystemConfigLoading(false);
    }
  }

  // Handle save advanced settings
  async function handleSaveAdvancedSettings() {
    if (!company?.id || !token) {
      setAdvancedSettingsError('No company ID or token found.');
      return;
    }
    setAdvancedSettingsLoading(true);
    setAdvancedSettingsError('');
    setAdvancedSettingsSuccess('');
    try {
      const res = await fetch(`${API_URL}/companies/${company.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          advancedSettings,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update advanced settings');
      }
      const data = await res.json();
      setCompanySettings(data);
      setAdvancedSettingsSuccess('Advanced settings saved successfully!');
      setTimeout(() => setAdvancedSettingsSuccess(''), 3000);
    } catch (err) {
      setAdvancedSettingsError(err instanceof Error ? err.message : 'Failed to update advanced settings');
    } finally {
      setAdvancedSettingsLoading(false);
    }
  }

  // Handle broadcast notification
  async function handleBroadcastNotification() {
    if (!token) {
      setBroadcastError('No authentication token found.');
      return;
    }
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setBroadcastError('Title and message are required.');
      return;
    }
    setBroadcastLoading(true);
    setBroadcastError('');
    setBroadcastSuccess('');
    setBroadcastResult(null);
    try {
      const res = await fetch(`${API_URL}/api/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          type: 'broadcast',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send broadcast notification');
      }
      const data = await res.json();
      setBroadcastResult(data);
      setBroadcastSuccess(`Broadcast notification sent successfully to ${data.sent || 0} devices!`);
      // Clear form after successful send
      setBroadcastTitle('');
      setBroadcastMessage('');
      setTimeout(() => {
        setBroadcastSuccess('');
        setBroadcastResult(null);
      }, 5000);
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : 'Failed to send broadcast notification');
    } finally {
      setBroadcastLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row overflow-hidden">
      <AdminSidebar current="Settings" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <motion.section className="px-10 py-6" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-primary-dark mb-1">Settings</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
              <div className="text-lg text-gray-600">Manage your account and system preferences</div>
            </div>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Settings */}
            <motion.div variants={item}>
              <Card className="bg-white shadow-md rounded-xl overflow-hidden">
                <div className="bg-light-bg px-6 py-4 border-b border-accent-blue">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiUser className="text-accent-blue" />
                    Profile Settings
                  </h2>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Profile Information</h3>
                      <button
                        onClick={handleToggleProfileEdit}
                        className="flex items-center gap-2 text-accent-blue hover:bg-light-bg/50 p-2 rounded-lg"
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
                            className={`${!profileEditable ? "bg-gray-100 text-gray-700" : "border-accent-blue focus:border-accent-blue"}`}
                          />
                          {profileFieldErrors.name && <p className="text-xs text-red-600">{profileFieldErrors.name}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            name="username"
                            value={profileForm.username}
                            onChange={handleProfileChange}
                            disabled={!profileEditable}
                            className={`${!profileEditable ? "bg-gray-100 text-gray-700" : "border-accent-blue focus:border-accent-blue"}`}
                          />
                          {profileFieldErrors.username && <p className="text-xs text-red-600">{profileFieldErrors.username}</p>}
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
                          {profileFieldErrors.email && <p className="text-xs text-red-600">{profileFieldErrors.email}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={profileForm.phone}
                            onChange={handleProfileChange}
                            disabled={!profileEditable}
                            className={`${!profileEditable ? "bg-gray-100 text-gray-700" : "border-accent-blue focus:border-accent-blue"}`}
                          />
                          {profileFieldErrors.phone && <p className="text-xs text-red-600">{profileFieldErrors.phone}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            name="company"
                            value={company?.name}
                            onChange={handleProfileChange}
                            disabled={true}
                            className={`${!profileEditable ? "bg-gray-100 text-gray-700" : "border-accent-blue focus:border-accent-blue"}`}
                          />
                        </div>
                      </>
                    )}

                    {profileEditable && !profileLoading && (
                      <div className="pt-4">
                        <button
                          className="bg-accent-blue text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-secondary-blue flex items-center gap-2"
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
                <div className="bg-light-bg px-6 py-4 border-b border-accent-blue">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiLock className="text-accent-blue" />
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
                        className="border-accent-blue bg-gray-100 text-gray-700"
                        autoComplete="current-password"
                        disabled={true}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="border-accent-blue focus:border-accent-blue pr-12"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-accent-blue"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="border-accent-blue focus:border-accent-blue pr-12"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-accent-blue"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    {passwordError && <div className="text-red-600 mt-2">{passwordError}</div>}
                    {passwordSuccess && <div className="text-green-600 mt-2">{passwordSuccess}</div>}
                    <div className="pt-4">
                      <button
                        className="bg-accent-blue text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-secondary-blue flex items-center gap-2"
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
                <div className="bg-light-bg px-6 py-4 border-b border-accent-blue">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiMail className="text-accent-blue" />
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-blue"></div>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-blue"></div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="alert-frequency">Alert Frequency</Label>
                      <select
                        id="alert-frequency"
                        value={alertFrequency}
                        onChange={(e) => setAlertFrequency(e.target.value)}
                        className="w-full rounded-lg border border-accent-blue px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      >
                        <option value="immediate">Immediate</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>

                    {notificationError && <div className="text-red-600 mt-2">{notificationError}</div>}
                    {notificationSuccess && <div className="text-green-600 mt-2">{notificationSuccess}</div>}
                    <div className="pt-4">
                      <button 
                        className="bg-accent-blue text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-secondary-blue flex items-center gap-2 disabled:opacity-50"
                        onClick={handleSaveNotificationPreferences}
                        disabled={notificationLoading || companySettingsLoading}
                      >
                        <FiSave />
                        {notificationLoading ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* System Configuration */}
            <motion.div variants={item}>
              <Card className="bg-white shadow-md rounded-xl overflow-hidden">
                <div className="bg-light-bg px-6 py-4 border-b border-accent-blue">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiSettings className="text-accent-blue" />
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
                            className="accent-accent-blue"
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
                            className="accent-accent-blue"
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
                            className="accent-accent-blue"
                          />
                          <span>High</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="prediction-model">Prediction Model Parameters</Label>
                        <button 
                          onClick={() => setShowModelParamsEdit(!showModelParamsEdit)}
                          className="text-accent-blue hover:bg-light-bg/50 p-2 rounded-lg flex items-center gap-1"
                        >
                          <FiSliders className="text-sm" />
                          <span className="text-sm">{showModelParamsEdit ? 'Cancel' : 'Edit Parameters'}</span>
                        </button>
                      </div>
                      {showModelParamsEdit ? (
                        <div className="bg-gray-100 p-3 rounded-lg space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Historical Data Weight:</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={predictionModelParams.temperatureWeight}
                              onChange={(e) => setPredictionModelParams({
                                ...predictionModelParams,
                                temperatureWeight: parseFloat(e.target.value) || 0
                              })}
                              className="w-20 border-accent-blue focus:border-accent-blue"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Weather Weight:</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={predictionModelParams.rainfallWeight}
                              onChange={(e) => setPredictionModelParams({
                                ...predictionModelParams,
                                rainfallWeight: parseFloat(e.target.value) || 0
                              })}
                              className="w-20 border-accent-blue focus:border-accent-blue"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Breeding Area Detection Weight:</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={predictionModelParams.populationDensityWeight}
                              onChange={(e) => setPredictionModelParams({
                                ...predictionModelParams,
                                populationDensityWeight: parseFloat(e.target.value) || 0
                              })}
                              className="w-20 border-accent-blue focus:border-accent-blue"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-600">
                          <div className="flex justify-between mb-1">
                            <span>Historical Data Weight:</span>
                            <span>{predictionModelParams.temperatureWeight.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span>Weather Weight:</span>
                            <span>{predictionModelParams.rainfallWeight.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Breeding Area Detection Weight:</span>
                            <span>{predictionModelParams.populationDensityWeight.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="risk-thresholds">Risk Level Thresholds</Label>
                        <button 
                          onClick={() => setShowRiskThresholdsEdit(!showRiskThresholdsEdit)}
                          className="text-accent-blue hover:bg-light-bg/50 p-2 rounded-lg flex items-center gap-1"
                        >
                          <FiSliders className="text-sm" />
                          <span className="text-sm">{showRiskThresholdsEdit ? 'Cancel' : 'Edit Thresholds'}</span>
                        </button>
                      </div>
                      {showRiskThresholdsEdit ? (
                        <div className="bg-gray-100 p-3 rounded-lg space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Low to Medium Threshold:</span>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={predictionModelParams.lowThreshold}
                              onChange={(e) => setPredictionModelParams({
                                ...predictionModelParams,
                                lowThreshold: parseFloat(e.target.value) || 0
                              })}
                              className="w-20 border-accent-blue focus:border-accent-blue"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Medium to High Threshold:</span>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={predictionModelParams.highThreshold}
                              onChange={(e) => setPredictionModelParams({
                                ...predictionModelParams,
                                highThreshold: parseFloat(e.target.value) || 0
                              })}
                              className="w-20 border-accent-blue focus:border-accent-blue"
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
                            <div>Low: &lt; {predictionModelParams.lowThreshold}</div>
                            <div>Medium: {predictionModelParams.lowThreshold} - {predictionModelParams.highThreshold}</div>
                            <div>High: &ge; {predictionModelParams.highThreshold}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-600">
                          <div className="flex justify-between mb-1">
                            <span>Low to Medium Threshold:</span>
                            <span>{predictionModelParams.lowThreshold}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span>Medium to High Threshold:</span>
                            <span>{predictionModelParams.highThreshold}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
                            <div>Low: &lt; {predictionModelParams.lowThreshold}</div>
                            <div>Medium: {predictionModelParams.lowThreshold} - {predictionModelParams.highThreshold}</div>
                            <div>High: &ge; {predictionModelParams.highThreshold}</div>
                          </div>
                        </div>
                      )}
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
                            className="accent-accent-blue"
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
                            className="accent-accent-blue"
                          />
                          <span>Manual</span>
                        </label>
                      </div>
                      {syncMode === "manual" && (
                        <button className="mt-2 bg-[#E5E7EB] text-black px-4 py-1 rounded-lg text-sm hover:bg-light-bg/50 flex items-center gap-1">
                          <FiRefreshCw className="text-xs" />
                          Sync Now
                        </button>
                      )}
                    </div>

                    {systemConfigError && <div className="text-red-600 mt-2">{systemConfigError}</div>}
                    {systemConfigSuccess && <div className="text-green-600 mt-2">{systemConfigSuccess}</div>}
                    <div className="pt-4">
                      <button 
                        className="bg-accent-blue text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-secondary-blue flex items-center gap-2 disabled:opacity-50"
                        onClick={handleSaveSystemConfiguration}
                        disabled={systemConfigLoading || companySettingsLoading}
                      >
                        <FiSettings />
                        {systemConfigLoading ? 'Saving...' : 'Apply Settings'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Operaional Areas */}
          <motion.div variants={item} className="mt-8">
            <Card className="bg-white shadow-md rounded-xl overflow-hidden">
              <div className="bg-light-bg px-6 py-4 border-b border-accent-blue">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiMapPin className="text-accent-blue" />
                    Operational Areas
                  </h2>
                  <button
                    onClick={() => setShowAddLocation(true)}
                    className="bg-accent-blue text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-secondary-blue flex items-center gap-2"
                  >
                    <FiPlus />
                    Add Operational Area
                  </button>
                </div>
              </div>
              <CardContent className="p-6">
                {locationsLoading ? (
                  <div className="text-gray-500 text-center py-8">Loading operational areas...</div>
                ) : locationsError ? (
                  <div className="text-red-600 text-center py-8">{locationsError}</div>
                ) : locations.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No operational areas found. Add your first operational area to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {locations.map((location: any) => (
                      <div key={location.id} className="border border-accent-blue rounded-lg p-4 bg-gray-50">
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
                              onClick={() => handleDeleteLocation(location.id)}
                              className="text-red-600 hover:bg-red-50 p-2 rounded-lg disabled:opacity-60"
                              title="Delete location"
                              disabled={deleteLoadingId === location.id || locationLoading}
                            >
                              {deleteLoadingId === location.id ? (
                                <FiRefreshCw className="animate-spin" />
                              ) : (
                                <FiTrash2 />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </CardContent>
            </Card>
          </motion.div>

          {/* Broadcast Notification */}
          <motion.div variants={item} className="mt-8">
            <Card className="bg-white shadow-md rounded-xl overflow-hidden">
              <div className="bg-light-bg px-6 py-4 border-b border-accent-blue">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FiBell className="text-accent-blue" />
                  Broadcast Notification
                </h2>
                <p className="text-sm text-gray-600 mt-1">Send push notifications to all mobile app users</p>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="broadcast-title">Notification Title *</Label>
                    <Input
                      id="broadcast-title"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="Enter notification title"
                      className="border-accent-blue focus:border-accent-blue"
                      disabled={broadcastLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="broadcast-message">Notification Message *</Label>
                    <textarea
                      id="broadcast-message"
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Enter notification message"
                      rows={4}
                      className="w-full rounded-lg border border-accent-blue px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                      disabled={broadcastLoading}
                    />
                  </div>
                  {broadcastError && (
                    <div className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                      {broadcastError}
                    </div>
                  )}
                  {broadcastSuccess && (
                    <div className="text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                      {broadcastSuccess}
                      {broadcastResult && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Sent to: {broadcastResult.sent} device(s)</p>
                          <p>Companies affected: {broadcastResult.companies}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      className="bg-accent-blue text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-secondary-blue flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleBroadcastNotification}
                      disabled={broadcastLoading || !broadcastTitle.trim() || !broadcastMessage.trim()}
                    >
                      <FiSend />
                      {broadcastLoading ? 'Sending...' : 'Send Broadcast Notification'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    <p>⚠️ This will send a push notification to all active mobile app users across all companies.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Advanced Settings */}
          {/* <motion.div variants={item} className="mt-8">
            <Card className="bg-white shadow-md rounded-xl overflow-hidden">
              <div className="bg-light-bg px-6 py-4 border-b border-accent-blue">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FiSettings className="text-accent-blue" />
                  Advanced Settings
                </h2>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold">Data Retention Policy</h3>
                      <p className="text-sm text-gray-500">Control how long data is stored in the system</p>
                    </div>
                    <button 
                      onClick={() => {
                        // TODO: Implement data retention policy configuration modal
                        alert('Data Retention Policy configuration coming soon!');
                      }}
                      className="bg-[#E5E7EB] text-black px-4 py-2 rounded-lg text-sm hover:bg-light-bg/50"
                    >
                      Configure
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold">API Access</h3>
                      <p className="text-sm text-gray-500">Manage API keys and access permissions</p>
                    </div>
                    <button 
                      onClick={() => {
                        // TODO: Implement API access management modal
                        alert('API Access management coming soon!');
                      }}
                      className="bg-[#E5E7EB] text-black px-4 py-2 rounded-lg text-sm hover:bg-light-bg/50"
                    >
                      Manage Keys
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold">System Backup</h3>
                      <p className="text-sm text-gray-500">Configure automatic backups and restore points</p>
                    </div>
                    <button 
                      onClick={() => {
                        // TODO: Implement system backup functionality
                        alert('System backup functionality coming soon!');
                      }}
                      className="bg-[#E5E7EB] text-black px-4 py-2 rounded-lg text-sm hover:bg-light-bg/50"
                    >
                      Backup Now
                    </button>
                  </div>
                  
                  {advancedSettingsError && <div className="text-red-600 mt-2">{advancedSettingsError}</div>}
                  {advancedSettingsSuccess && <div className="text-green-600 mt-2">{advancedSettingsSuccess}</div>}
                  
                  <div className="pt-4">
                    <button 
                      className="bg-accent-blue text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-secondary-blue flex items-center gap-2 disabled:opacity-50"
                      onClick={handleSaveAdvancedSettings}
                      disabled={advancedSettingsLoading || companySettingsLoading}
                    >
                      <FiSettings />
                      {advancedSettingsLoading ? 'Saving...' : 'Save Advanced Settings'}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div> */}
        </motion.section>

        {/* Operational Area Modal */}
        <AnimatePresence>
          {showAddLocation && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleCancelLocation}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-light-bg px-6 py-4 border-b border-accent-blue flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-primary-dark">
                    <FiMapPin className="text-accent-blue" />
                    Add New Operational Area
                  </h2>
                  <button
                    onClick={handleCancelLocation}
                    className="text-primary-dark hover:bg-white/40 p-2 rounded-full transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location-name">Operational Area Name *</Label>
                      <Input
                        id="location-name"
                        name="name"
                        value={locationForm.name}
                        onChange={handleLocationChange}
                        placeholder="Enter operational area name"
                        className="border-accent-blue focus:border-accent-blue"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-address">Operational Area Address</Label>
                      <Input
                        id="location-address"
                        name="address"
                        value={locationForm.address}
                        onChange={handleLocationChange}
                        placeholder="Enter operational area address (optional)"
                        className="border-accent-blue focus:border-accent-blue"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-status">Status</Label>
                      <select
                        id="location-status"
                        name="isActive"
                        value={locationForm.isActive.toString()}
                        onChange={(e) => setLocationForm({ ...locationForm, isActive: e.target.value === "true" })}
                        className="w-full rounded-md border border-accent-blue bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Pin Exact Location on Map</Label>
                    <MapPicker
                      value={(() => {
                        const lat = parseFloat(locationForm.latitude as unknown as string)
                        const lng = parseFloat(locationForm.longitude as unknown as string)
                        return isNaN(lat) || isNaN(lng) ? null : { lat, lng }
                      })()}
                      onChange={async (coords) => {
                        setLocationForm((prev) => ({
                          ...prev,
                          latitude: coords.lat.toString(),
                          longitude: coords.lng.toString(),
                        }))
                        try {
                          const res = await fetch(`${API_URL}/geocode/reverse?lat=${coords.lat}&lon=${coords.lng}`, {
                            headers: { Accept: "application/json" },
                          })
                          if (res.ok) {
                            const data = await res.json()
                            const display = data?.display_name || ""
                            if (display) {
                              setLocationForm((prev) => ({ ...prev, address: display }))
                            }
                          }
                        } catch {
                          // ignore reverse geocode errors silently
                        }
                      }}
                      height={360}
                    />
                    <p className="text-xs text-gray-500">
                      Selected: {locationForm.latitude || "-"}, {locationForm.longitude || "-"}
                    </p>
                  </div>

                  {locationError && <div className="text-red-600">{locationError}</div>}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={handleCancelLocation}
                      className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLocationSave}
                      disabled={locationLoading}
                      className="bg-accent-blue text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-secondary-blue transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <FiSave />
                      {locationLoading ? "Saving..." : "Add Location"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Dialog */}
        <AnimatePresence>
          {showSuccessDialog && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowSuccessDialog(false)}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiCheckCircle className="text-green-600 text-4xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
                  <p className="text-gray-600 mb-8">{successDialogMessage}</p>
                  <button
                    onClick={() => setShowSuccessDialog(false)}
                    className="w-full bg-accent-blue text-white py-3 rounded-xl font-bold hover:bg-secondary-blue transition-colors"
                  >
                    Great!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
