"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FiSave, FiEdit2, FiLock, FiMail, FiUser, FiSettings, FiSliders, FiRefreshCw } from "react-icons/fi"

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

export default function SettingsPage() {
  const [profileEditable, setProfileEditable] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [alertFrequency, setAlertFrequency] = useState("immediate")
  const [alertThreshold, setAlertThreshold] = useState("medium")
  const [syncMode, setSyncMode] = useState("automatic")

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
                      >
                        <FiEdit2 />
                        <span>{profileEditable ? "Cancel" : "Edit Profile"}</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          defaultValue="Alex Johnson"
                          disabled={!profileEditable}
                          className={`${
                            !profileEditable ? "bg-gray-100 text-gray-700" : "border-[#E2C275] focus:border-[#A21C1C]"
                          }`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          defaultValue="alex.johnson@universiti-malaya.edu"
                          disabled={!profileEditable}
                          className={`${
                            !profileEditable ? "bg-gray-100 text-gray-700" : "border-[#E2C275] focus:border-[#A21C1C]"
                          }`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="organization">Organization</Label>
                        <Input
                          id="organization"
                          defaultValue="University Malaya"
                          disabled={!profileEditable}
                          className={`${
                            !profileEditable ? "bg-gray-100 text-gray-700" : "border-[#E2C275] focus:border-[#A21C1C]"
                          }`}
                        />
                      </div>
                    </div>

                    {profileEditable && (
                      <div className="pt-4">
                        <button
                          className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2"
                          onClick={() => setProfileEditable(false)}
                        >
                          <FiSave />
                          Save Changes
                        </button>
                      </div>
                    )}
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
                        defaultValue="••••••••"
                        className="border-[#E2C275] focus:border-[#A21C1C]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        defaultValue=""
                        placeholder="••••••••"
                        className="border-[#E2C275] focus:border-[#A21C1C]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        defaultValue=""
                        placeholder="••••••••"
                        className="border-[#E2C275] focus:border-[#A21C1C]"
                      />
                    </div>

                    <div className="pt-4">
                      <button className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2">
                        <FiLock />
                        Update Password
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
