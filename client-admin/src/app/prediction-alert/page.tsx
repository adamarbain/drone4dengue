"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import PredictionMap from "@/components/PredictionMap"
import { FiFilter, FiDownload, FiRefreshCw, FiEye, FiAlertTriangle, FiCheckCircle, FiClock } from "react-icons/fi"
import Image from "next/image"
import { useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/context/AuthContext"

const riskAreas = [
  { area: "Andher East, Mumbai", riskLevel: "High", confidence: 85, date: "April 20, 2025", color: "bg-red-500" },
  {
    area: "Koramangala, Bangalore",
    riskLevel: "Medium",
    confidence: 68,
    date: "April 19, 2025",
    color: "bg-yellow-500",
  },
  { area: "Adyar, Chennai", riskLevel: "High", confidence: 92, date: "April 20, 2025", color: "bg-red-500" },
  { area: "Ernakulam, Kochi", riskLevel: "Low", confidence: 35, date: "April 18, 2025", color: "bg-green-500" },
  {
    area: "Banjara Hills, Hyderabad",
    riskLevel: "Medium",
    confidence: 74,
    date: "April 19, 2025",
    color: "bg-yellow-500",
  },
  { area: "Salt Lake, Kolkata", riskLevel: "High", confidence: 88, date: "April 20, 2025", color: "bg-red-500" },
]

const riskLevelStyles: Record<string, string> = {
  High: "text-red-700 bg-red-100",
  Medium: "text-yellow-800 bg-yellow-100",
  Low: "text-green-700 bg-green-100",
}

const alertHistory = [
  {
    title: "High Risk Alert - Andher East",
    date: "April 20, 2025",
    status: "Sent to 24 recipients",
    icon: <FiAlertTriangle className="text-red-500" />,
  },
  {
    title: "Medium Risk Alert - Koramangala",
    date: "April 19, 2025",
    status: "Sent to 18 recipients",
    icon: <FiClock className="text-yellow-500" />,
  },
  {
    title: "Emergency Report",
    date: "April 18, 2025",
    status: "Sent to 35 recipients",
    icon: <FiCheckCircle className="text-green-500" />,
  },
]

const allStates = ["All States", "Maharashtra", "Karnataka", "Tamil Nadu"]
const allCities = ["All Cities", "Mumbai", "Bangalore", "Chennai"]
const allRiskLevels = ["All Levels", "High", "Medium", "Low"]

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

export default function PredictionAlertPage() {
  const { companyId } = useAuth()
  // Filter states
  const [selectedState, setSelectedState] = useState("All States")
  const [selectedCity, setSelectedCity] = useState("All Cities")
  const [selectedRisk, setSelectedRisk] = useState("All Levels")
  const [dateRange, setDateRange] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [modelAvailable, setModelAvailable] = useState(true) // Simulate model/data available
  const [showDetails, setShowDetails] = useState<null | typeof riskAreas[0]>(null)
  const [alertRecipient, setAlertRecipient] = useState("All Health Officials")
  const [savingAlert, setSavingAlert] = useState(false)
  const [alertSaveError, setAlertSaveError] = useState("")
  const [alertSaveSuccess, setAlertSaveSuccess] = useState("")
  const [predictions, setPredictions] = useState<any[]>([])

  // Filter risk areas
  const filteredAreas = riskAreas.filter((area) => {
    let match = true
    if (selectedRisk !== "All Levels" && area.riskLevel !== selectedRisk) match = false
    if (selectedCity !== "All Cities" && !area.area.includes(selectedCity)) match = false
    if (selectedState !== "All States") {
      // Simulate state filter by area name (for demo)
      if (selectedState === "Maharashtra" && !area.area.includes("Mumbai")) match = false
      if (selectedState === "Karnataka" && !area.area.includes("Bangalore")) match = false
      if (selectedState === "Tamil Nadu" && !area.area.includes("Chennai")) match = false
    }
    // Date range filter not implemented (demo)
    return match
  })

  // Handlers

  const handleExport = () => {
    setLoading(true)
    setError("")
    setTimeout(() => {
      setLoading(false)
      // Simulate export error
      // setError("Export failed. Please try again.")
    }, 1000)
  }

  const handleSaveAlertRules = () => {
    setAlertSaveError("")
    setAlertSaveSuccess("")
    if (!alertRecipient) {
      setAlertSaveError("Please select at least one recipient.")
      return
    }
    setSavingAlert(true)
    setTimeout(() => {
      // Simulate save failure randomly
      // if (Math.random() < 0.2) {
      //   setAlertSaveError("Failed to save alert rules. Please retry.")
      //   setSavingAlert(false)
      //   return
      // }
      setAlertSaveSuccess("Alert rules saved successfully.")
      setSavingAlert(false)
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row  border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Prediction & Alert" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />

        {/* Content */}
        <motion.section className="px-10 py-6" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">Prediction & Alert</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">Dengue Prediction & Alert System for your company</div>
            </div>
          </motion.div>

          {/* Dengue Predictions Section */}
          <motion.div variants={item} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl">Dengue Predictions</h2>
              <div className="flex gap-3">
                <button className="bg-[#E5E7EB] text-black px-6 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8] flex items-center gap-2" onClick={handleExport} disabled={loading}>
                  <FiDownload /> {loading ? "Exporting..." : "Export"}
                </button>
                <button className="bg-[#E5E7EB] text-black px-6 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8] flex items-center gap-2" disabled>
                  <FiFilter /> Filter
                </button>
                <button className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2" onClick={handleUpdatePrediction} disabled={loading}>
                  <FiRefreshCw /> {loading ? "Updating..." : "Update Prediction"}
                </button>
              </div>
            </div>
            {error && (
              <div className="mb-4 text-red-600 font-semibold bg-red-100 rounded-lg px-4 py-2 border border-red-200">{error}</div>
            )}
            {!modelAvailable && (
              <div className="mb-4 text-red-600 font-semibold bg-red-100 rounded-lg px-4 py-2 border border-red-200">Prediction model unavailable. Please try again later.</div>
            )}
            {/* New Prediction Map Component */}
            <PredictionMap onPredictionUpdate={setPredictions} />

            {/* Filters */}
            <motion.div variants={item} className="mb-6">
              <div className="flex gap-4 items-end">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm">State</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]" value={selectedState} onChange={e => setSelectedState(e.target.value)}>
                    {allStates.map(state => <option key={state}>{state}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm">City</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                    {allCities.map(city => <option key={city}>{city}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm">Risk Level</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]" value={selectedRisk} onChange={e => setSelectedRisk(e.target.value)}>
                    {allRiskLevels.map(risk => <option key={risk}>{risk}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm">Date Range</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                    value={dateRange}
                    onChange={e => setDateRange(e.target.value)}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Predicted Risk Areas Table */}
          <motion.div variants={item} className="mb-10">
            <div className="font-bold text-xl mb-3">Predicted Risk Areas</div>
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full bg-white rounded-xl">
                <thead>
                  <tr className="text-left text-black font-semibold text-base bg-[#F3EAD8]">
                    <th className="py-3 px-6">Area Name</th>
                    <th className="py-3 px-6">Risk Level</th>
                    <th className="py-3 px-6">Confidence Score</th>
                    <th className="py-3 px-6">Prediction Date</th>
                    <th className="py-3 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAreas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">No areas match the selected filters.</td>
                    </tr>
                  ) : (
                    filteredAreas.map((area, idx) => (
                      <tr key={area.area} className={idx % 2 === 0 ? "bg-[#F9F6F2]" : "bg-white"}>
                        <td className="py-3 px-6 font-medium text-black">{area.area}</td>
                        <td className="py-3 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${riskLevelStyles[area.riskLevel]} flex items-center gap-2 w-fit`}
                          >
                            <div className={`w-2 h-2 rounded-full ${area.color}`}></div>
                            {area.riskLevel}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${area.color}`}
                                style={{ width: `${area.confidence}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{area.confidence}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-black">{area.date}</td>
                        <td className="py-3 px-6">
                          <div className="flex gap-2">
                            <button className="text-[#A21C1C] hover:bg-[#F3EAD8] p-2 rounded-lg" onClick={() => setShowDetails(area)}>
                              <FiEye />
                            </button>
                            <button className="text-[#A21C1C] hover:bg-[#F3EAD8] p-2 rounded-lg" onClick={handleExport} disabled={loading}>
                              <FiDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-gray-500 mt-2">Showing {filteredAreas.length} of {riskAreas.length} areas</div>
          </motion.div>

          {/* View Details Modal */}
          {showDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 shadow-lg w-full max-w-md relative">
                <button className="absolute top-2 right-2 text-gray-400 hover:text-black" onClick={() => setShowDetails(null)}>&times;</button>
                <h2 className="text-xl font-bold mb-4">Area Details</h2>
                <div className="mb-2"><span className="font-semibold">Area:</span> {showDetails.area}</div>
                <div className="mb-2"><span className="font-semibold">Risk Level:</span> {showDetails.riskLevel}</div>
                <div className="mb-2"><span className="font-semibold">Confidence:</span> {showDetails.confidence}%</div>
                <div className="mb-2"><span className="font-semibold">Prediction Date:</span> {showDetails.date}</div>
                <div className="mt-4">
                  <button className="bg-[#A21C1C] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#7C1D1D]" onClick={() => setShowDetails(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Set Alert Rules */}
            <div className="bg-white rounded-xl p-6 shadow">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <FiAlertTriangle className="text-[#A21C1C]" />
                Set Alert Rules
              </h3>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-black mb-2">Risk Level Thresholds</div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">High Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">≥ 75%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">≥ 50%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Low Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">≥ 25%</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-black mb-2">Notification Recipients</div>
                  <select className="w-full rounded-lg border border-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#E2C275]" value={alertRecipient} onChange={e => setAlertRecipient(e.target.value)}>
                    <option value="">-- Select Recipients --</option>
                    <option>All Health Officials</option>
                  </select>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-black mb-2">Notification Channels</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-[#A21C1C]" defaultChecked />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-[#A21C1C]" defaultChecked />
                      <span className="text-sm">SMS</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="accent-[#A21C1C]" />
                      <span className="text-sm">Push Notification</span>
                    </label>
                  </div>
                </div>

                {alertSaveError && <div className="text-red-600 bg-red-100 border border-red-200 rounded-lg px-4 py-2 font-semibold">{alertSaveError}</div>}
                {alertSaveSuccess && <div className="text-green-700 bg-green-100 border border-green-200 rounded-lg px-4 py-2 font-semibold">{alertSaveSuccess}</div>}
                <button className="w-full bg-[#A21C1C] text-white py-2 rounded-lg font-bold hover:bg-[#7C1D1D] mt-4 disabled:opacity-60" onClick={handleSaveAlertRules} disabled={savingAlert || !alertRecipient}>
                  {savingAlert ? "Saving..." : "Save Alert Rules"}
                </button>
              </div>
            </div>

            {/* Scheduled Notifications & Alert History */}
            <div className="space-y-6">
              {/* Scheduled Notifications */}
              <div className="bg-white rounded-xl p-6 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FiClock className="text-[#A21C1C]" />
                    Scheduled Notifications
                  </h3>
                  <button className="bg-[#A21C1C] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#7C1D1D]">
                    + Create New Alert Schedule
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#F9F6F2] rounded-lg">
                    <div>
                      <div className="font-medium text-sm">Daily High Risk Report</div>
                      <div className="text-xs text-gray-500">Every day at 8:00 AM</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-[#A21C1C] hover:bg-white p-1 rounded">
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button className="text-[#A21C1C] hover:bg-white p-1 rounded">
                        <FiAlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#F9F6F2] rounded-lg">
                    <div>
                      <div className="font-medium text-sm">Weekly Summary</div>
                      <div className="text-xs text-gray-500">Every Mon at 9:00 AM</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-[#A21C1C] hover:bg-white p-1 rounded">
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button className="text-[#A21C1C] hover:bg-white p-1 rounded">
                        <FiAlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert History */}
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FiCheckCircle className="text-[#A21C1C]" />
                  Alert History
                </h3>

                <div className="space-y-3">
                  {alertHistory.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#F9F6F2] rounded-lg">
                      <div className="flex items-center gap-3">
                        {alert.icon}
                        <div>
                          <div className="font-medium text-sm">{alert.title}</div>
                          <div className="text-xs text-gray-500">
                            {alert.date} - {alert.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-[#A21C1C] hover:bg-white p-1 rounded">
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button className="text-[#A21C1C] hover:bg-white p-1 rounded">
                          <FiDownload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full text-[#A21C1C] font-semibold text-sm mt-4 hover:bg-[#F3EAD8] py-2 rounded-lg">
                  View All Alert History
                </button>
              </div>
            </div>
          </motion.div>

          {/* Bottom Actions */}
          <motion.div variants={item} className="flex justify-end gap-4">
            <button className="bg-[#E5E7EB] text-black px-8 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8]">
              Reset to Defaults
            </button>
            <button className="bg-[#A21C1C] text-white px-8 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D]">
              Save All Settings
            </button>
          </motion.div>
        </motion.section>
      </main>
    </div>
  )
}
