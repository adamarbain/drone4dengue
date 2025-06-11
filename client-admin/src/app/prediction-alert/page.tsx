"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import { FiFilter, FiDownload, FiRefreshCw, FiEye, FiAlertTriangle, FiCheckCircle, FiClock } from "react-icons/fi"
import Image from "next/image"

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

export default function PredictionAlertPage() {
  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row rounded-[24px] border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Prediction & Alert" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />

        {/* Content */}
        <section className="px-10 py-6">
          <h1 className="text-3xl font-bold text-black mb-1">Prediction & Alert</h1>
          <div className="text-xl text-gray-400 mb-6">Dengue Prediction & Alert System</div>

          {/* Dengue Predictions Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl">Dengue Predictions</h2>
              <div className="flex gap-3">
                <button className="bg-[#E5E7EB] text-black px-6 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8] flex items-center gap-2">
                  <FiDownload /> Export
                </button>
                <button className="bg-[#E5E7EB] text-black px-6 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8] flex items-center gap-2">
                  <FiFilter /> Filter
                </button>
                <button className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D] flex items-center gap-2">
                  <FiRefreshCw /> Update Prediction
                </button>
              </div>
            </div>

            {/* Map and Risk Cards */}
            <div className="flex gap-6 mb-8">
              {/* Map */}
              <div className="flex-1 bg-white rounded-xl overflow-hidden shadow">
                <div className="p-4 bg-[#F3EAD8] border-b">
                  <h3 className="font-semibold text-black">Prediction Map</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>High Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Medium Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Low Risk</span>
                    </div>
                  </div>
                </div>
                <div className="h-80 relative">
                  <Image src="/images/prediction-map.png" alt="Prediction Map" fill className="object-cover" />
                </div>
              </div>

              {/* Risk Level Cards */}
              <div className="w-80 space-y-4">
                <div className="bg-red-100 rounded-xl p-6 border-l-4 border-red-500">
                  <div className="flex items-center gap-3 mb-2">
                    <FiAlertTriangle className="text-red-500 text-xl" />
                    <span className="font-semibold text-red-700">High Risk Areas</span>
                  </div>
                  <div className="text-3xl font-bold text-red-700">12</div>
                  <div className="text-sm text-red-600">+2 from last week</div>
                </div>

                <div className="bg-yellow-100 rounded-xl p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center gap-3 mb-2">
                    <FiClock className="text-yellow-600 text-xl" />
                    <span className="font-semibold text-yellow-700">Medium Risk Areas</span>
                  </div>
                  <div className="text-3xl font-bold text-yellow-700">28</div>
                  <div className="text-sm text-yellow-600">-5 from last week</div>
                </div>

                <div className="bg-green-100 rounded-xl p-6 border-l-4 border-green-500">
                  <div className="flex items-center gap-3 mb-2">
                    <FiCheckCircle className="text-green-500 text-xl" />
                    <span className="font-semibold text-green-700">Low Risk Areas</span>
                  </div>
                  <div className="text-3xl font-bold text-green-700">45</div>
                  <div className="text-sm text-green-600">+3 from last week</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <div className="flex gap-4 items-end">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm">State</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]">
                    <option>All States</option>
                    <option>Maharashtra</option>
                    <option>Karnataka</option>
                    <option>Tamil Nadu</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm">City</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]">
                    <option>All Cities</option>
                    <option>Mumbai</option>
                    <option>Bangalore</option>
                    <option>Chennai</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm">Risk Level</label>
                  <select className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]">
                    <option>All Levels</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-black text-sm">Date Range</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    className="rounded-lg border border-gray-400 px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Predicted Risk Areas Table */}
          <div className="mb-10">
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
                  {riskAreas.map((area, idx) => (
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
                          <button className="text-[#A21C1C] hover:bg-[#F3EAD8] p-2 rounded-lg">
                            <FiEye />
                          </button>
                          <button className="text-[#A21C1C] hover:bg-[#F3EAD8] p-2 rounded-lg">
                            <FiDownload />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-gray-500 mt-2">Showing 1 of 65 areas</div>
          </div>

          {/* Notification Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
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
                  <select className="w-full rounded-lg border border-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#E2C275]">
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

                <button className="w-full bg-[#A21C1C] text-white py-2 rounded-lg font-bold hover:bg-[#7C1D1D] mt-4">
                  Save Alert Rules
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
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-end gap-4">
            <button className="bg-[#E5E7EB] text-black px-8 py-2 rounded-lg font-bold text-base hover:bg-[#F3EAD8]">
              Reset to Defaults
            </button>
            <button className="bg-[#A21C1C] text-white px-8 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D]">
              Save All Settings
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
